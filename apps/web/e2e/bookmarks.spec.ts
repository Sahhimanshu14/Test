import { test, expect } from '@playwright/test';

test.describe('Bookmarks Vault Flows', () => {
  test('unauthenticated access to /bookmarks redirects to login', async ({ page }) => {
    await page.goto('/bookmarks');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fbookmarks/);
  });

  test('displays Cadet Question Vault header and search box for authenticated cadet', async ({
    page,
  }) => {
    await page.goto('/login');
    const demoBtn = page.getByRole('button', { name: /Student/i }).first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await page.getByRole('button', { name: /Sign In as Cadet/i }).click();

      await page.goto('/bookmarks');
      await expect(page.getByText(/Saved Revision Questions/i)).toBeVisible();
      await expect(page.getByPlaceholder(/Search bookmarks by keyword/i)).toBeVisible();
    }
  });
});
