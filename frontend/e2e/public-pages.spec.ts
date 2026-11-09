import { expect, test } from '@playwright/test';

const publicRoutes = [
  { path: '/', heading: /Abyssinia Academy|አቢሲኒያ|Akademii/i },
  { path: '/about', nav: 'About' },
  { path: '/blogs', nav: 'Blogs' },
  { path: '/pricing', nav: 'Pricing' },
  { path: '/contact', nav: 'Contact' },
  { path: '/register', nav: 'Register' },
] as const;

test.describe('Public website', () => {
  test('homepage renders brand and primary navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Abyssinia Academy').first()).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Primary' });
    await expect(nav.getByRole('link', { name: 'About' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Contact' })).toBeVisible();
  });

  for (const route of publicRoutes) {
    test(`${route.path} loads without console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(route.path);
      await expect(page.locator('body')).toBeVisible();
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }

  test('primary navigation routes between pages', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: 'About' })
      .click();
    await expect(page).toHaveURL(/\/about$/);
    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: 'Contact' })
      .click();
    await expect(page).toHaveURL(/\/contact$/);
  });

  test('unknown route shows not-found page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-phase14');
    await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('link', { name: /return home/i })).toBeVisible();
  });

  test('blog listing requests backend posts', async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/blog/posts') && response.request().method() === 'GET',
      { timeout: 20_000 },
    );
    await page.goto('/blogs');
    const response = await responsePromise;
    expect(response.ok()).toBe(true);
    const body = (await response.json()) as { success: boolean; data?: { items?: unknown[] } };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data?.items)).toBe(true);
  });

  test('events listing requests backend events', async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/events') &&
        !response.url().includes('/admin/') &&
        response.request().method() === 'GET',
      { timeout: 20_000 },
    );
    await page.goto('/events');
    const response = await responsePromise;
    expect(response.ok()).toBe(true);
    const body = (await response.json()) as { success: boolean; data?: { items?: unknown[] } };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data?.items)).toBe(true);
  });

  test('mobile navigation can open and navigate', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const menuButton = page.getByRole('button', { name: /menu|open navigation|navigation/i });
    if (await menuButton.isVisible()) {
      await menuButton.click();
    }
    const about = page.getByRole('link', { name: 'About' }).first();
    await expect(about).toBeVisible();
    await about.click();
    await expect(page).toHaveURL(/\/about$/);
  });
});
