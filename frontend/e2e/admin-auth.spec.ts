import { expect, test } from '@playwright/test';

test.describe('Admin authentication routes', () => {
  test('unauthenticated users are redirected from dashboard', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('unauthenticated users are redirected from CMS pages', async ({ page }) => {
    await page.goto('/admin/pages');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('login page renders without exposing tokens in URL', async ({ page }) => {
    await page.goto('/admin/login');
    expect(page.url()).not.toMatch(/token|jwt|access/i);
    await expect(page.getByRole('button', { name: /sign in|log in|login/i })).toBeVisible();
  });

  test('invalid credentials show an error and stay on login', async ({ page }) => {
    await page.goto('/admin/login');
    await page.locator('#admin-email').fill('not-a-real-admin@example.com');
    await page.locator('#admin-password').fill('WrongPassword1');
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
  });
});
