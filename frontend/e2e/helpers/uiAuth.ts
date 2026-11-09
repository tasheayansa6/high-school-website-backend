import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function adminUiLogin(page: Page, email: string, password: string) {
  await clearBrowserAuth(page);
  await page.goto('/admin/login');
  await page.locator('#admin-email').fill(email);
  await page.locator('#admin-password').fill(password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 20_000 });
}

export async function teacherUiLogin(page: Page, email: string, password: string) {
  await clearBrowserAuth(page);
  await page.goto('/teacher/login');
  await page.locator('#teacher-email').fill(email);
  await page.locator('#teacher-password').fill(password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 20_000 });
}

export async function studentUiLogin(page: Page, identifier: string, password: string) {
  await clearBrowserAuth(page);
  await page.goto('/student/login');
  await page.locator('#student-identifier').fill(identifier);
  await page.locator('#student-password').fill(password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 20_000 });
}

export async function clearBrowserAuth(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}
