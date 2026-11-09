import { expect, test } from '@playwright/test';

import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ACTOR_PASSWORD,
  publishExam,
  seedAcademicScaffold,
  type SmsFixture,
} from './helpers/smsApi';
import { adminUiLogin, clearBrowserAuth, studentUiLogin, teacherUiLogin } from './helpers/uiAuth';

/**
 * Browser E2E for Admin → Teacher → Student SMS connectivity.
 * Academic year / class scaffold is seeded via API (dedicated E2E prefix).
 * Actor creation, assignment, enrollment, and portal ops use the UI.
 */
test.describe.configure({ mode: 'serial' });

test.describe('Cross-portal SMS E2E', () => {
  let fixture: SmsFixture;
  let teacherEmail = '';
  let studentEmail = '';
  let studentCode = '';
  let studentName = '';
  let studentOpsLabel = '';
  let assignmentTitle = '';

  test.beforeAll(async ({ request }) => {
    fixture = await seedAcademicScaffold(request);
    teacherEmail = `${fixture.prefix}.teacher@example.com`;
    studentEmail = `${fixture.prefix}.student@example.com`;
    studentCode = `${fixture.code}-STU`;
    studentName = `E2eStud ${fixture.stamp}`;
    studentOpsLabel = `${studentName} (${studentCode})`;
    assignmentTitle = `E2E Lab ${fixture.stamp}`;
  });

  test('admin logs in and opens dashboard', async ({ page }) => {
    await adminUiLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });

  test('admin creates a teacher account', async ({ page }) => {
    await adminUiLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin/teachers/new');
    await page.locator('#teacher-first').fill('E2eTeach');
    await page.locator('#teacher-last').fill(fixture.stamp);
    await page.locator('#teacher-email').fill(teacherEmail);
    await page.locator('#teacher-password').fill(ACTOR_PASSWORD);
    await page.locator('#teacher-code').fill(`${fixture.code}-TCH`);
    await page.getByRole('button', { name: /create teacher/i }).click();
    await expect(page).toHaveURL(/\/admin\/teachers\/\d+/, { timeout: 20_000 });
    await expect(page.getByRole('status')).toBeVisible({ timeout: 10_000 });
  });

  test('admin creates a student account', async ({ page }) => {
    await adminUiLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin/students/new');
    await page.locator('#student-first').fill('E2eStud');
    await page.locator('#student-last').fill(fixture.stamp);
    await page.locator('#student-code').fill(studentCode);
    await page.locator('#student-email').fill(studentEmail);
    await page.locator('#student-password').fill(ACTOR_PASSWORD);
    await page.getByRole('button', { name: /create student/i }).click();
    await expect(page).toHaveURL(/\/admin\/students\/\d+/, { timeout: 20_000 });
    await expect(page.getByRole('status')).toBeVisible({ timeout: 10_000 });
  });

  test('admin assigns teacher to class and subject', async ({ page }) => {
    await adminUiLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin/teaching-assignments');
    await expect(page.getByRole('heading', { name: /create assignment/i })).toBeVisible({
      timeout: 20_000,
    });
    const teacherOption = page.locator('#assign-teacher option').filter({ hasText: fixture.stamp });
    await expect(teacherOption).toHaveCount(1, { timeout: 20_000 });
    await page.locator('#assign-teacher').selectOption({ label: await teacherOption.innerText() });
    await expect(page.locator(`#assign-class option[value="${fixture.klass.id}"]`)).toHaveCount(1, {
      timeout: 20_000,
    });
    await page.locator('#assign-class').selectOption(String(fixture.klass.id));
    await page.locator('#assign-subject').selectOption(String(fixture.subject.id));
    await page.getByRole('button', { name: /^create assignment$/i }).click();
    await expect(page.getByRole('status')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('ul li').filter({ hasText: fixture.subject.name }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('admin enrolls the student in the class', async ({ page }) => {
    await adminUiLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin/enrollments');
    await expect(page.getByRole('heading', { name: /enroll a student/i })).toBeVisible({
      timeout: 20_000,
    });
    await page.locator('#enroll-student-search').fill(studentCode);
    const studentOption = page.locator('#enroll-student option').filter({ hasText: studentCode });
    await expect(studentOption).toHaveCount(1, { timeout: 20_000 });
    await page.locator('#enroll-student').selectOption({ label: await studentOption.innerText() });
    await page.locator('#enroll-class').selectOption(String(fixture.klass.id));
    await page.getByRole('button', { name: /enroll student/i }).click();
    await expect(page.getByRole('status')).toBeVisible({ timeout: 15_000 });
  });

  test('teacher logs in and sees the assigned class', async ({ page }) => {
    await clearBrowserAuth(page);
    await teacherUiLogin(page, teacherEmail, ACTOR_PASSWORD);
    await page.goto('/teacher/classes');
    await expect(page.getByText(fixture.klass.name).first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole('link', { name: fixture.klass.name }).first().click();
    await expect(page).toHaveURL(new RegExp(`/teacher/classes/${fixture.klass.id}`));
    await expect(page.getByText(studentName).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(studentCode).first()).toBeVisible();
  });

  test('teacher records attendance for the enrolled student', async ({ page }) => {
    await teacherUiLogin(page, teacherEmail, ACTOR_PASSWORD);
    await page.goto('/teacher/attendance');
    await page.locator('#t-att-class').selectOption(String(fixture.klass.id));
    await page.locator('#t-att-date').fill('2038-10-12');
    await expect(page.getByText(studentOpsLabel).first()).toBeVisible({ timeout: 15_000 });
    await page.getByLabel(`Status for ${studentOpsLabel}`).selectOption('LATE');
    await page.getByRole('button', { name: /save attendance/i }).click();
    await expect(page.getByRole('status').or(page.getByRole('alert')).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('teacher creates an assignment', async ({ page }) => {
    await teacherUiLogin(page, teacherEmail, ACTOR_PASSWORD);
    await page.goto('/teacher/assignments');
    await page.locator('#asg-title').fill(assignmentTitle);
    await page.locator('#asg-description').fill('E2E assignment body');
    await page.locator('#asg-class').selectOption(String(fixture.klass.id));
    await page.locator('#asg-subject').selectOption(String(fixture.subject.id));
    await page.locator('#asg-published').check();
    await page.getByRole('button', { name: /^create assignment$/i }).click();
    await expect(page.getByText(assignmentTitle).first()).toBeVisible({ timeout: 15_000 });
  });

  test('student logs in, sees attendance and submits the assignment', async ({ page }) => {
    await clearBrowserAuth(page);
    await studentUiLogin(page, studentEmail, ACTOR_PASSWORD);
    await expect(page).toHaveURL(/\/student\/dashboard/);

    await page.goto('/student/attendance');
    await expect(page.locator('ul li').filter({ hasText: 'LATE' }).first()).toBeVisible({
      timeout: 15_000,
    });

    await page.goto('/student/assignments');
    await expect(page.getByText(assignmentTitle).first()).toBeVisible({ timeout: 15_000 });
    await page
      .locator('ul li')
      .filter({ hasText: assignmentTitle })
      .getByRole('button', { name: /^submit$/i })
      .click();
    await page.locator('#submit-content').fill('E2E student submission content');
    await page.getByRole('dialog').getByRole('button', { name: /^submit$/i }).click();
    await expect(page.getByRole('status')).toBeVisible({ timeout: 15_000 });
  });

  test('teacher reviews submission and grades it', async ({ page }) => {
    await clearBrowserAuth(page);
    await teacherUiLogin(page, teacherEmail, ACTOR_PASSWORD);
    await page.goto('/teacher/assignments');
    await page.getByRole('button', { name: /submissions|view submissions/i }).first().click();
    await expect(page.getByText(/E2E student submission content|SUBMITTED|Submitted/i).first()).toBeVisible({
      timeout: 15_000,
    });
    const scoreInput = page.locator('input[id^="grade-score-"]').first();
    await scoreInput.fill('18');
    await page.locator('textarea[id^="grade-feedback-"]').first().fill('Well done E2E');
    await page.getByRole('button', { name: /save grade/i }).first().click();
    await expect(
      page.getByRole('status').or(page.getByText(/Well done E2E|GRADED|graded/i)).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('teacher enters exam marks; admin publishes; student sees results', async ({
    page,
    request,
  }) => {
    await teacherUiLogin(page, teacherEmail, ACTOR_PASSWORD);
    await page.goto('/teacher/results');
    await page.locator('#t-res-exam').selectOption(String(fixture.exam.id));
    await expect(page.getByText(studentOpsLabel).first()).toBeVisible({ timeout: 15_000 });
    await page.getByLabel(`Score for ${studentOpsLabel}`).fill('17');
    await page.getByRole('button', { name: /save results/i }).click();
    await expect(page.getByRole('status').or(page.getByRole('alert')).first()).toBeVisible({
      timeout: 15_000,
    });

    // Publication is an admin capability (teacher cannot publish).
    await publishExam(request, fixture.exam.id);

    await clearBrowserAuth(page);
    await studentUiLogin(page, studentCode, ACTOR_PASSWORD);
    await page.goto('/student/results');
    await expect(page.getByText(fixture.exam.name).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/17/).first()).toBeVisible();
  });
});
