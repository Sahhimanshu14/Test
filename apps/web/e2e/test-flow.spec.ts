import { test, expect } from '@playwright/test';

test.describe('Examination Simulation & Mock Test Flow', () => {
  test('unauthenticated access to /tests redirects to login', async ({ page }) => {
    await page.goto('/tests');
    await expect(page).toHaveURL(/\/login\?redirect=%2Ftests/);
  });

  test('displays CDS examination simulations directory for authenticated candidate', async ({
    page,
  }) => {
    await page.goto('/login');
    const demoBtn = page.getByRole('button', { name: /Student/i }).first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await page.getByRole('button', { name: /Sign In as Cadet/i }).click();

      await page.goto('/tests');
      await expect(page.getByText(/CDS Examination Simulations/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /All Tests/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Full Mocks/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Sectional/i })).toBeVisible();
    }
  });

  test('filters tests by Full Mocks and Sectional', async ({ page }) => {
    await page.goto('/login');
    const demoBtn = page.getByRole('button', { name: /Student/i }).first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await page.getByRole('button', { name: /Sign In as Cadet/i }).click();

      await page.goto('/tests');
      const fullMocksFilter = page.getByRole('button', { name: /Full Mocks/i });
      await fullMocksFilter.click();
      await expect(fullMocksFilter).toHaveClass(/bg-emerald-500/);
    }
  });
});
