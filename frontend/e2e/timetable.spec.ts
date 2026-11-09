import { expect, test } from '@playwright/test';

import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  API_BASE,
  ACTOR_PASSWORD,
  seedAcademicScaffold,
  type SmsFixture,
} from './helpers/smsApi';
import { adminUiLogin, clearBrowserAuth, studentUiLogin, teacherUiLogin } from './helpers/uiAuth';

test.describe.configure({ mode: 'serial' });

test.describe('Timetable module E2E', () => {
  let fixture: SmsFixture;
  let teacherEmail = '';
  let studentEmail = '';
  let subjectName = '';

  test.beforeAll(async ({ request }) => {
    fixture = await seedAcademicScaffold(request);
    subjectName = fixture.subject.name;
    teacherEmail = `${fixture.prefix}.tt.teacher@example.com`;
    studentEmail = `${fixture.prefix}.tt.student@example.com`;

    const adminLogin = await request.post(`${API_BASE}/admin/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const adminToken = ((await adminLogin.json()) as { data: { accessToken: string } }).data
      .accessToken;
    const headers = { Authorization: `Bearer ${adminToken}` };

    const teacherRes = await request.post(`${API_BASE}/admin/sms/teachers`, {
      headers,
      data: {
        email: teacherEmail,
        password: ACTOR_PASSWORD,
        firstName: 'TtTeach',
        lastName: fixture.stamp,
        employeeCode: `${fixture.code}-TT`,
      },
    });
    const teacher = (await teacherRes.json()).data.teacher as { id: number };

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
        email: studentEmail,
        password: ACTOR_PASSWORD,
        firstName: 'TtStud',
        lastName: fixture.stamp,
        studentCode: `${fixture.code}-TS`,
      },
    });
    const student = (await studentRes.json()).data.student as { id: number };

    await request.post(`${API_BASE}/admin/sms/enrollments`, {
      headers,
      data: {
        studentId: student.id,
        classOfferingId: fixture.klass.id,
        academicYearId: fixture.year.id,
      },
    });

    const roomRes = await request.post(`${API_BASE}/admin/sms/timetables/classrooms`, {
      headers,
      data: { name: `Room ${fixture.stamp}`, code: `${fixture.code}-RM`, capacity: 40 },
    });
    const classroom = (await roomRes.json()).data.classroom as { id: number };

    const ttRes = await request.post(`${API_BASE}/admin/sms/timetables`, {
      headers,
      data: {
        academicYearId: fixture.year.id,
        classOfferingId: fixture.klass.id,
        title: `E2E TT ${fixture.stamp}`,
      },
    });
    const timetable = (await ttRes.json()).data.timetable as { id: number };

    await request.post(`${API_BASE}/admin/sms/timetables/${timetable.id}/entries`, {
      headers,
      data: {
        dayOfWeek: 'MONDAY',
        startTime: '09:00',
        endTime: '09:45',
        subjectId: fixture.subject.id,
        teacherId: teacher.id,
        classroomId: classroom.id,
      },
    });

    await request.post(`${API_BASE}/admin/sms/timetables/${timetable.id}/publish`, { headers });
  });

  test('admin can open timetables management', async ({ page }) => {
    await adminUiLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin/timetables');
    await expect(page.getByRole('heading', { name: /^timetables$/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(`E2E TT ${fixture.stamp}`).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('PUBLISHED', { exact: false }).first()).toBeVisible();
  });

  test('teacher sees published own timetable', async ({ page }) => {
    await teacherUiLogin(page, teacherEmail, ACTOR_PASSWORD);
    await page.goto('/teacher/timetable');
    await expect(page.getByRole('heading', { name: /my timetable/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(subjectName).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/09:00/)).toBeVisible();
  });

  test('student sees published class timetable', async ({ page }) => {
    await studentUiLogin(page, studentEmail, ACTOR_PASSWORD);
    await page.goto('/student/timetable');
    await expect(page.getByRole('heading', { name: /my timetable/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(subjectName).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/09:00/)).toBeVisible();
  });

  test('guest cannot open portal timetable pages', async ({ page }) => {
    await clearBrowserAuth(page);
    await page.goto('/teacher/timetable');
    await expect(page).toHaveURL(/\/teacher\/login/, { timeout: 15_000 });
    await page.goto('/student/timetable');
    await expect(page).toHaveURL(/\/student\/login/, { timeout: 15_000 });
  });
});
