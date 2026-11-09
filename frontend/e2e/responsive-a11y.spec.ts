import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

const pages = [
  '/',
  '/about',
  '/academics',
  '/admission',
  '/contact',
  '/news',
  '/events',
  '/signin',
  '/admin/login',
] as const;

test.describe('Responsive layout', () => {
  for (const viewport of viewports) {
    for (const path of pages) {
      test(`${path} at ${viewport.name} has no horizontal overflow`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(path);
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          return {
            scrollWidth: doc.scrollWidth,
            clientWidth: doc.clientWidth,
          };
        });
        expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
      });
    }
  }
});

test.describe('Accessibility basics', () => {
  test('homepage has labelled primary navigation and language control', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
    await expect(page.getByRole('button', { name: /select language|language/i })).toBeVisible();
  });

  test('contact form inputs have accessible names', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('#contact-name')).toBeVisible({ timeout: 20_000 });
    const labeledControls = page.locator('input[id], textarea[id], select[id]');
    const count = await labeledControls.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      const control = labeledControls.nth(i);
      const id = await control.getAttribute('id');
      expect(id).toBeTruthy();
      await expect(page.locator(`label[for="${id}"]`)).toHaveCount(1);
    }
  });

  test('admin login form is labelled', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('label[for="signin-email"]')).toBeVisible();
    await expect(page.locator('#signin-email')).toBeVisible();
    await expect(page.locator('label[for="signin-password"]')).toBeVisible();
    await expect(page.locator('#signin-password')).toBeVisible();
  });

  test('focus is visible on primary nav link', async ({ page }) => {
    await page.goto('/');
    const about = page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: 'About' });
    await about.focus();
    const outline = await about.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        outlineStyle: styles.outlineStyle,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow,
      };
    });
    const hasFocusRing =
      (outline.outlineStyle !== 'none' && outline.outlineWidth !== '0px') ||
      outline.boxShadow !== 'none';
    expect(hasFocusRing).toBe(true);
  });
});
