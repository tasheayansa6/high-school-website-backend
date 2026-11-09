import { expect, test } from '@playwright/test';

import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  API_BASE,
  ACTOR_PASSWORD,
  seedAcademicScaffold,
  studentLoginApi,
  teacherLoginApi,
  type SmsFixture,
} from './helpers/smsApi';
import { clearBrowserAuth } from './helpers/uiAuth';

test.describe.configure({ mode: 'serial' });

test.describe('Portal auth and authorization', () => {
  let fixture: SmsFixture;
  let teacherToken = '';
  let outsiderToken = '';
  let studentToken = '';
  let otherStudentToken = '';
  let teacherEmail = '';
  let studentEmail = '';
  let otherStudentEmail = '';

  test.beforeAll(async ({ request }) => {
    fixture = await seedAcademicScaffold(request);
    const adminLogin = await request.post(`${API_BASE}/admin/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const adminBody = await adminLogin.json();
    const adminToken = adminBody.data.accessToken as string;
    const headers = { Authorization: `Bearer ${adminToken}` };

    const teacherRes = await request.post(`${API_BASE}/admin/sms/teachers`, {
      headers,
      data: {
        email: `${fixture.prefix}.auth.teacher@example.com`,
        password: ACTOR_PASSWORD,
        firstName: 'Auth',
        lastName: 'Teacher',
        employeeCode: `${fixture.code}-AT`,
      },
    });
    const teacher = (await teacherRes.json()).data.teacher as { id: number; email: string };
    teacherEmail = teacher.email;

    await request.post(`${API_BASE}/admin/sms/teaching-assignments`, {
      headers,
      data: {
        teacherId: teacher.id,
        classOfferingId: fixture.klass.id,
        subjectId: fixture.subject.id,
      },
    });

    const studentRes = await request.post(`${API_BASE}/admin/sms/students`, {
      headers,
      data: {
        email: `${fixture.prefix}.auth.student@example.com`,
        password: ACTOR_PASSWORD,
        firstName: 'Auth',
        lastName: 'Student',
        studentCode: `${fixture.code}-AS`,
      },
    });
    const student = (await studentRes.json()).data.student as { id: number; email: string };
    studentEmail = student.email;

    const otherRes = await request.post(`${API_BASE}/admin/sms/students`, {
      headers,
      data: {
        email: `${fixture.prefix}.auth.other@example.com`,
        password: ACTOR_PASSWORD,
        firstName: 'Other',
        lastName: 'Student',
        studentCode: `${fixture.code}-AO`,
      },
    });
    const other = (await otherRes.json()).data.student as { id: number; email: string };
    otherStudentEmail = other.email;

    await request.post(`${API_BASE}/admin/sms/enrollments`, {
      headers,
      data: {
        studentId: student.id,
        classOfferingId: fixture.klass.id,
        academicYearId: fixture.year.id,
      },
    });

    teacherToken = await teacherLoginApi(request, teacherEmail);
    outsiderToken = await teacherLoginApi(request, fixture.outsiderTeacher.email);
    studentToken = await studentLoginApi(request, { email: studentEmail });
    otherStudentToken = await studentLoginApi(request, { email: otherStudentEmail });
  });

  test('unauthenticated users are redirected from all three portals', async ({ page }) => {
    await clearBrowserAuth(page);
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto('/teacher/dashboard');
    await expect(page).toHaveURL(/\/teacher\/login/);
    await page.goto('/student/dashboard');
    await expect(page).toHaveURL(/\/student\/login/);
  });

  test('teacher and student tokens cannot access admin APIs', async ({ request }) => {
    for (const token of [teacherToken, studentToken]) {
      const res = await request.get(`${API_BASE}/admin/sms/teachers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status(), await res.text()).toBe(401);
    }
  });

  test('student token cannot access teacher APIs', async ({ request }) => {
    const res = await request.get(`${API_BASE}/teacher/classes`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    expect(res.status()).toBe(401);
  });

  test('outsider teacher cannot open an unassigned class', async ({ request }) => {
    const res = await request.get(`${API_BASE}/teacher/classes/${fixture.klass.id}`, {
      headers: { Authorization: `Bearer ${outsiderToken}` },
    });
    expect([403, 404]).toContain(res.status());
  });

  test('student cannot mark attendance via teacher API', async ({ request }) => {
    const res = await request.post(`${API_BASE}/teacher/attendance`, {
      headers: { Authorization: `Bearer ${studentToken}` },
      data: {
        studentId: 1,
        classOfferingId: fixture.klass.id,
        attendanceDate: '2038-10-20',
        status: 'PRESENT',
      },
    });
    expect(res.status()).toBe(401);
  });

  test('student cannot mutate examination results via teacher API', async ({ request }) => {
    const res = await request.put(`${API_BASE}/teacher/examinations/${fixture.exam.id}/results`, {
      headers: { Authorization: `Bearer ${studentToken}` },
      data: { results: [{ studentId: 1, score: 1 }] },
    });
    expect(res.status()).toBe(401);
  });

  test('student attendance responses do not include another student', async ({ request }) => {
    await request.post(`${API_BASE}/teacher/attendance`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
      data: {
        classOfferingId: fixture.klass.id,
        attendanceDate: '2038-10-21',
        studentId: (
          await (
            await request.get(`${API_BASE}/teacher/students`, {
              headers: { Authorization: `Bearer ${teacherToken}` },
              params: { classOfferingId: fixture.klass.id },
            })
          ).json()
        ).data.items[0].id,
        status: 'ABSENT',
      },
    });

    const otherView = await request.get(`${API_BASE}/student/attendance`, {
      headers: { Authorization: `Bearer ${otherStudentToken}` },
    });
    expect(otherView.status()).toBe(200);
    const body = await otherView.json();
    const items = body.data.items as { studentId?: number; status?: string }[];
    expect(items.every((row) => row.status !== 'ABSENT' || !row.studentId)).toBeTruthy();
    expect(items.length === 0 || !JSON.stringify(items).includes(studentEmail)).toBeTruthy();
  });
});
