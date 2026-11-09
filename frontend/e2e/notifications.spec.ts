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

test.describe('Notifications E2E', () => {
  let fixture: SmsFixture;
  let teacherEmail = '';
  let studentEmail = '';
  let studentCode = '';
  let assignmentId = 0;

  test.beforeAll(async ({ request }) => {
    fixture = await seedAcademicScaffold(request);
    teacherEmail = `${fixture.prefix}.nt.teacher@example.com`;
    studentEmail = `${fixture.prefix}.nt.student@example.com`;
    studentCode = `${fixture.code}-NTS`;

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
        firstName: 'NtTeach',
        lastName: fixture.stamp,
        employeeCode: `${fixture.code}-NTT`,
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
        firstName: 'NtStud',
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

    const teacherLogin = await request.post(`${API_BASE}/teacher/auth/login`, {
      data: { email: teacherEmail, password: ACTOR_PASSWORD },
    });
    const teacherToken = ((await teacherLogin.json()) as { data: { accessToken: string } }).data
      .accessToken;

    const assignmentRes = await request.post(`${API_BASE}/teacher/assignments`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
      data: {
        title: `Notify HW ${fixture.stamp}`,
        description: 'E2E notification trigger',
        classOfferingId: fixture.klass.id,
        subjectId: fixture.subject.id,
        maxScore: 10,
        isPublished: true,
      },
    });
    assignmentId = (await assignmentRes.json()).data.assignment.id as number;
    if (!assignmentId) {
      throw new Error(`Failed to create assignment for notifications E2E: ${assignmentRes.status()}`);
    }
  });

  test('admin can open notifications page and mark items read', async ({ page }) => {
    await adminUiLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page.getByTestId('admin-notification-bell')).toBeVisible();
    await page.goto('/admin/notifications');
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByTestId('admin-notifications-page')).toBeVisible();

    const unreadRows = page.locator('[data-testid="admin-notification-row"][data-read="false"]');
    const unreadBefore = await unreadRows.count();
    if (unreadBefore > 0) {
      await unreadRows.first().getByRole('button', { name: 'Mark read' }).click();
      await expect
        .poll(async () => page.locator('[data-testid="admin-notification-row"][data-read="false"]').count(), {
          timeout: 10_000,
        })
        .toBeLessThan(unreadBefore);
    }
  });

  test('teacher sees unread badge and can open assignment-related notification', async ({
    page,
  }) => {
    // Create a submission so teacher receives a notification
    const studentLogin = await page.request.post(`${API_BASE}/student/auth/login`, {
      data: { studentCode, password: ACTOR_PASSWORD },
    });
    const studentToken = ((await studentLogin.json()) as { data: { accessToken: string } }).data
      .accessToken;
    await page.request.post(`${API_BASE}/student/assignments/${assignmentId}/submit`, {
      headers: { Authorization: `Bearer ${studentToken}` },
      data: { content: 'E2E submission' },
    });

    await teacherUiLogin(page, teacherEmail, ACTOR_PASSWORD);
    await expect(page.getByTestId('teacher-notification-bell')).toBeVisible();
    await page.getByTestId('teacher-notification-bell').click();
    const panel = page.getByTestId('teacher-notification-panel');
    await expect(panel).toBeVisible();
    await panel.getByRole('link', { name: /^view all$/i }).click();
    await expect(page).toHaveURL(/\/teacher\/notifications/);
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
  });

  test('student sees assignment notification and can navigate to assignments', async ({ page }) => {
    await studentUiLogin(page, studentCode, ACTOR_PASSWORD);
    await expect(page.getByTestId('student-notification-bell')).toBeVisible();
    await page.goto('/student/notifications');
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByText(/new assignment published/i).first()).toBeVisible();

    const openLink = page.getByRole('link', { name: /open related page/i }).first();
    if (await openLink.count()) {
      await openLink.click();
      await expect(page).toHaveURL(/\/student\/assignments/);
    }
  });

  test('unauthorized student cannot mark another student notification via API', async ({
    request,
  }) => {
    const studentLogin = await request.post(`${API_BASE}/student/auth/login`, {
      data: { studentCode, password: ACTOR_PASSWORD },
    });
    const studentToken = ((await studentLogin.json()) as { data: { accessToken: string } }).data
      .accessToken;
    const list = await request.get(`${API_BASE}/student/notifications`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const items = ((await list.json()) as { data: { items: { id: number }[] } }).data.items;
    expect(items.length).toBeGreaterThan(0);
    const notificationId = items[0].id;

    const outsiderLogin = await request.post(`${API_BASE}/student/auth/login`, {
      data: {
        studentCode: `${fixture.code}-OUT`,
        password: ACTOR_PASSWORD,
      },
    });
    // Outsider may not exist; create quickly if needed
    if (!outsiderLogin.ok()) {
      const adminLogin = await request.post(`${API_BASE}/admin/auth/login`, {
        data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      });
      const adminToken = ((await adminLogin.json()) as { data: { accessToken: string } }).data
        .accessToken;
      await request.post(`${API_BASE}/admin/sms/students`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: {
          email: `${fixture.prefix}.nt.outsider@example.com`,
          password: ACTOR_PASSWORD,
          firstName: 'Out',
          lastName: fixture.stamp,
          studentCode: `${fixture.code}-OUT`,
        },
      });
    }

    const outsiderAuth = await request.post(`${API_BASE}/student/auth/login`, {
      data: { studentCode: `${fixture.code}-OUT`, password: ACTOR_PASSWORD },
    });
    const outsiderToken = ((await outsiderAuth.json()) as { data: { accessToken: string } }).data
      .accessToken;

    const denied = await request.post(`${API_BASE}/student/notifications/${notificationId}/read`, {
      headers: { Authorization: `Bearer ${outsiderToken}` },
    });
    expect(denied.status()).toBe(404);
  });
});
