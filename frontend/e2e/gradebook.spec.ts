import { expect, test } from '@playwright/test';

import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  API_BASE,
  ACTOR_PASSWORD,
  seedAcademicScaffold,
  type SmsFixture,
} from './helpers/smsApi';
import { adminUiLogin, studentUiLogin, teacherUiLogin } from './helpers/uiAuth';

test.describe.configure({ mode: 'serial' });

test.describe('Gradebook E2E', () => {
  let fixture: SmsFixture;
  let teacherEmail = '';
  let studentEmail = '';
  let examId = 0;

  test.beforeAll(async ({ request }) => {
    fixture = await seedAcademicScaffold(request);
    teacherEmail = `${fixture.prefix}.gb.teacher@example.com`;
    studentEmail = `${fixture.prefix}.gb.student@example.com`;

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
        firstName: 'GbTeach',
        lastName: fixture.stamp,
        employeeCode: `${fixture.code}-GBT`,
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
        firstName: 'GbStud',
        lastName: fixture.stamp,
        studentCode: `${fixture.code}-GBS`,
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

    const teacherLogin = await request.post(`${API_BASE}/teacher/auth/login`, {
      data: { email: teacherEmail, password: ACTOR_PASSWORD },
    });
    const teacherToken = ((await teacherLogin.json()) as { data: { accessToken: string } }).data
      .accessToken;

    const examRes = await request.post(`${API_BASE}/teacher/examinations`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
      data: {
        name: `GB Quiz ${fixture.stamp}`,
        examType: 'QUIZ',
        classOfferingId: fixture.klass.id,
        subjectId: fixture.subject.id,
        academicYearId: fixture.year.id,
        maxScore: 20,
        weight: 1,
      },
    });
    examId = (await examRes.json()).data.examination.id as number;

    await request.put(`${API_BASE}/teacher/examinations/${examId}/results`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
      data: {
        results: [{ studentId: student.id, score: 17 }],
      },
    });

    await request.post(`${API_BASE}/teacher/examinations/${examId}/submit`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });

    const approve = await request.post(
      `${API_BASE}/admin/sms/gradebook/examinations/${examId}/approve`,
      { headers },
    );
    if (approve.status() !== 200) {
      throw new Error(`Failed to approve exam ${examId}: ${approve.status()}`);
    }
  });

  test('admin gradebook page loads overview and configuration', async ({ page }) => {
    await adminUiLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin/gradebook');
    await expect(page.getByRole('heading', { name: 'Gradebook' })).toBeVisible();
    await page.getByRole('button', { name: 'Configuration' }).click();
    await expect(page.getByText('Grading scales')).toBeVisible();
    await expect(page.getByText('Assessment categories')).toBeVisible();
  });

  test('teacher gradebook shows assigned class', async ({ page }) => {
    await teacherUiLogin(page, teacherEmail, ACTOR_PASSWORD);
    await page.goto('/teacher/gradebook');
    await expect(page.getByRole('heading', { name: 'My Gradebooks' })).toBeVisible();
    await expect(page.getByLabel('Assigned gradebook')).toBeVisible();
  });

  test('student gradebook shows published totals only', async ({ page }) => {
    await studentUiLogin(page, studentEmail, ACTOR_PASSWORD);
    await page.goto('/student/gradebook');
    await expect(page.getByRole('heading', { name: 'My Grades' })).toBeVisible();
    await expect(page.getByText(fixture.subject.name)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/17\/20/)).toBeVisible();
  });
});
