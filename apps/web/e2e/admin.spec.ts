import { test, expect } from '@playwright/test';

test.describe('Admin Command & RBAC Flows', () => {
  test('unauthenticated access to /admin redirects to login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin/);
  });

  test('student cadet receives Restricted Security Clearance when attempting to access /admin', async ({
    page,
  }) => {
    await page.goto('/login');
    const demoStudentBtn = page.getByRole('button', { name: /Student/i }).first();
    if (await demoStudentBtn.isVisible()) {
      await demoStudentBtn.click();
      await page.getByRole('button', { name: /Sign In as Cadet/i }).click();

      // Attempt to access admin console
      await page.goto('/admin');

      // AuthGuard should display restricted clearance message
      await expect(
        page.getByRole('heading', { name: /Restricted Security Clearance/i }),
      ).toBeVisible();
    }
  });

  test('staff admin signs in and accesses staff command', async ({ page }) => {
    await page.goto('/login');
    const demoAdminBtn = page.getByRole('button', { name: /Admin/i }).first();
    if (await demoAdminBtn.isVisible()) {
      await demoAdminBtn.click();
      await page.getByRole('button', { name: /Sign In as Cadet/i }).click();

      await page.goto('/admin/dashboard');
      // Should not show Restricted Security Clearance
      await expect(
        page.getByRole('heading', { name: /Restricted Security Clearance/i }),
      ).not.toBeVisible();
    }
  });
});
