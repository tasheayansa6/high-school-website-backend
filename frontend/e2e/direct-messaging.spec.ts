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

test.describe('Direct Messaging E2E', () => {
  let fixture: SmsFixture;
  let teacherEmail = '';
  let studentCode = '';
  let outsiderEmail = '';

  test.beforeAll(async ({ request }) => {
    fixture = await seedAcademicScaffold(request);
    teacherEmail = `${fixture.prefix}.dm.teacher@example.com`;
    outsiderEmail = `${fixture.prefix}.dm.out@example.com`;
    studentCode = `${fixture.code}-DMS`;

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
        firstName: 'DmTeach',
        lastName: fixture.stamp,
        employeeCode: `${fixture.code}-DMT`,
      },
    });
    const teacher = (await teacherRes.json()).data.teacher as { id: number };

    await request.post(`${API_BASE}/admin/sms/teachers`, {
      headers,
      data: {
        email: outsiderEmail,
        password: ACTOR_PASSWORD,
        firstName: 'DmOut',
        lastName: fixture.stamp,
        employeeCode: `${fixture.code}-DMO`,
      },
    });

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
        email: `${fixture.prefix}.dm.student@example.com`,
        password: ACTOR_PASSWORD,
        firstName: 'DmStud',
        lastName: fixture.stamp,
        studentCode,
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
  });

  test('admin can open messages and start a conversation with a teacher', async ({ page }) => {
    await adminUiLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin/messages');
    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible();
    await page.getByRole('button', { name: /^new$/i }).click();
    await expect(page.getByTestId('admin-compose-dialog')).toBeVisible();
    await page.getByPlaceholder('Search eligible contacts…').fill('DmTeach');
    await expect(page.getByTestId('admin-contact-option').first()).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('admin-contact-option').first().click();
    await expect(page.getByTestId('admin-message-input')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('admin-message-input').fill('Hello from admin');
    await page.getByRole('button', { name: /^send$/i }).click();
    await expect(page.getByTestId('admin-message-bubble').filter({ hasText: 'Hello from admin' })).toBeVisible();
  });

  test('teacher can message assigned student; outsider cannot via API', async ({ page, request }) => {
    await teacherUiLogin(page, teacherEmail, ACTOR_PASSWORD);
    await page.goto('/teacher/messages');
    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible();
    await page.getByRole('button', { name: /^new$/i }).click();
    await page.getByPlaceholder('Search eligible contacts…').fill('DmStud');
    await expect(page.getByTestId('teacher-contact-option').first()).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('teacher-contact-option').first().click();
    await page.getByTestId('teacher-message-input').fill('Please check your materials');
    await page.getByRole('button', { name: /^send$/i }).click();
    await expect(
      page.getByTestId('teacher-message-bubble').filter({ hasText: 'Please check your materials' }),
    ).toBeVisible();

    const outsiderLogin = await request.post(`${API_BASE}/teacher/auth/login`, {
      data: { email: outsiderEmail, password: ACTOR_PASSWORD },
    });
    const outsiderToken = ((await outsiderLogin.json()) as { data: { accessToken: string } }).data
      .accessToken;
    const studentLogin = await request.post(`${API_BASE}/student/auth/login`, {
      data: { studentCode, password: ACTOR_PASSWORD },
    });
    const studentId = ((await studentLogin.json()) as { data: { student: { id: number } } }).data
      .student.id;
    const denied = await request.post(`${API_BASE}/teacher/messages/conversations`, {
      headers: { Authorization: `Bearer ${outsiderToken}` },
      data: { peerType: 'STUDENT', peerId: studentId },
    });
    expect(denied.status()).toBe(403);
  });

  test('student sees teacher message and can reply', async ({ page }) => {
    await studentUiLogin(page, studentCode, ACTOR_PASSWORD);
    await page.goto('/student/messages');
    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible();
    await expect(page.getByTestId('student-conversation-item').first()).toBeVisible({
      timeout: 10_000,
    });
    await page.getByTestId('student-conversation-item').first().click();
    await expect(page.getByText('Please check your materials')).toBeVisible();
    await page.getByTestId('student-message-input').fill('Will do');
    await page.getByRole('button', { name: /^send$/i }).click();
    await expect(page.getByTestId('student-message-bubble').filter({ hasText: 'Will do' })).toBeVisible();
  });
});
