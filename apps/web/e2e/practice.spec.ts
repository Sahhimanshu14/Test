import { test, expect } from '@playwright/test';

test.describe('Practice & Question Answering Flows', () => {
  test('unauthenticated access redirects to login', async ({ page }) => {
    await page.goto('/practice');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fpractice/);
  });

  test('practice launcher displays mode cards when authenticated', async ({ page }) => {
    await page.goto('/login');
    const demoBtn = page.getByRole('button', { name: /Student/i }).first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await page.getByRole('button', { name: /Sign In as Cadet/i }).click();

      await page.goto('/practice');
      await expect(page.getByText(/All Questions/i)).toBeVisible();
      await expect(page.getByText(/Subject Focus/i)).toBeVisible();
      await expect(page.getByText(/Chapter Drills/i)).toBeVisible();
      await expect(page.getByText(/Topic Mastery/i)).toBeVisible();
      await expect(page.getByText(/Difficulty Calibrated/i)).toBeVisible();
      await expect(page.getByText(/Previous Year Questions/i)).toBeVisible();
    }
  });

  test('displays practice drill configuration modal', async ({ page }) => {
    await page.goto('/login');
    const demoBtn = page.getByRole('button', { name: /Student/i }).first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await page.getByRole('button', { name: /Sign In as Cadet/i }).click();

      await page.goto('/practice');
      const allQuestionsCard = page.getByText(/All Questions/i).first();
      await allQuestionsCard.click();

      // Configure Drill modal should open
      await expect(page.getByText(/Configure Drill/i)).toBeVisible();
      await expect(page.getByText(/Question Count/i)).toBeVisible();
      await expect(page.getByText(/Randomize Question Order/i)).toBeVisible();
    }
  });
});
