import { expect, test } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

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

test.describe('Learning materials E2E', () => {
  let fixture: SmsFixture;
  let teacherEmail = '';
  let studentEmail = '';
  let pdfPath = '';

  test.beforeAll(async ({ request }) => {
    fixture = await seedAcademicScaffold(request);
    teacherEmail = `${fixture.prefix}.lm.teacher@example.com`;
    studentEmail = `${fixture.prefix}.lm.student@example.com`;
    pdfPath = path.join(os.tmpdir(), `lm-${fixture.stamp}.pdf`);
    fs.writeFileSync(pdfPath, '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');

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
        firstName: 'LmTeach',
        lastName: fixture.stamp,
        employeeCode: `${fixture.code}-LM`,
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
        firstName: 'LmStud',
        lastName: fixture.stamp,
        studentCode: `${fixture.code}-LS`,
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

  test.afterAll(() => {
    try {
      fs.unlinkSync(pdfPath);
    } catch {
      /* ignore */
    }
  });

  test('teacher uploads and publishes a material', async ({ page }) => {
    await teacherUiLogin(page, teacherEmail, ACTOR_PASSWORD);
    await page.goto('/teacher/learning-materials');
    await expect(page.getByRole('heading', { name: /learning materials/i })).toBeVisible({
      timeout: 20_000,
    });

    await page.locator('#lm-title').fill(`Notes ${fixture.stamp}`);
    await page.locator('#lm-desc').fill('E2E handout');
    await page.locator('#lm-class').selectOption(String(fixture.klass.id));
    await page.locator('#lm-subject').selectOption(String(fixture.subject.id));
    await page.locator('#lm-file').setInputFiles(pdfPath);
    await page.getByLabel(/publish immediately/i).check();
    await page.getByRole('button', { name: /^upload$/i }).click();

    await expect(page.getByRole('status')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(`Notes ${fixture.stamp}`).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('student sees published material', async ({ page }) => {
    await studentUiLogin(page, studentEmail, ACTOR_PASSWORD);
    await page.goto('/student/learning-materials');
    await expect(page.getByRole('heading', { name: /learning materials/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(`Notes ${fixture.stamp}`).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('admin can open oversight page', async ({ page }) => {
    await adminUiLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin/learning-materials');
    await expect(page.getByRole('heading', { name: /learning materials/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(`Notes ${fixture.stamp}`).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
