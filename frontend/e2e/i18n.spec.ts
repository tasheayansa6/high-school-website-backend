import { expect, test } from '@playwright/test';

test.describe('Multilingual support', () => {
  test('English is the default interface language', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(
      page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'About' }),
    ).toBeVisible();
  });

  test('switching to Amharic updates document language and nav labels', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /select language|language/i }).click();
    await page.getByRole('option', { name: /አማርኛ/i }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'am');
    await expect(page.getByRole('navigation', { name: /Primary|ዋና|Ijaa/i })).toBeVisible();
  });

  test('switching to Afaan Oromoo updates document language', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /select language|language/i }).click();
    await page.getByRole('option', { name: /Afaan Oromoo/i }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'om');
  });

  test('selected language persists after reload', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /select language|language/i }).click();
    await page.getByRole('option', { name: /አማርኛ/i }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'am');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'am');
  });

  test('language switch does not break contact form fields', async ({ page }) => {
    await page.goto('/contact');
    await page.getByRole('button', { name: /select language|language/i }).click();
    await page.getByRole('option', { name: /Afaan Oromoo/i }).click();
    await expect(page.locator('form').first()).toBeVisible();
    await expect(page.locator('input, textarea, select').first()).toBeVisible();
  });
});
