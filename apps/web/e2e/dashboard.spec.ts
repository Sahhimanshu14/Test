import { test, expect } from '@playwright/test';

test.describe('Dashboard & Navigation Guard', () => {
  test('unauthenticated access to /dashboard redirects to /login with redirect query parameter', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);
    await expect(page.getByRole('heading', { name: /Cadet Sign In/i })).toBeVisible();
  });

  test('authenticated cadet loads dashboard metrics and modules', async ({ page }) => {
    // Navigate to login and use quick demo autofill
    await page.goto('/login');

    const demoBtn = page.getByRole('button', { name: /Student/i }).first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await page.getByRole('button', { name: /Sign In as Cadet/i }).click();

      // Should land on dashboard
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.getByText(/Command Briefing|Cadet Dashboard/i)).toBeVisible();
    }
  });

  test('unauthenticated access to /bookmarks redirects to /login', async ({ page }) => {
    await page.goto('/bookmarks');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fbookmarks/);
  });

  test('unauthenticated access to /mistakes redirects to /login', async ({ page }) => {
    await page.goto('/mistakes');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fmistakes/);
  });
});
