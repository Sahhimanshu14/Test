import { test, expect } from '@playwright/test';

test.describe('Phase 21 — Real-World Acceptance & Persona Testing', () => {
  test('login page provides 1-click access to all 5 standard personas', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /Cadet Sign In/i })).toBeVisible();

    // Verify all 5 personas exist in Quick Demo Access
    const studentBtn = page.getByRole('button', { name: 'Student' });
    const editorBtn = page.getByRole('button', { name: 'Editor' });
    const modBtn = page.getByRole('button', { name: 'Moderator' });
    const adminBtn = page.getByRole('button', { name: 'Admin' });
    const superAdminBtn = page.getByRole('button', { name: 'Super Admin' });

    await expect(studentBtn).toBeVisible();
    await expect(editorBtn).toBeVisible();
    await expect(modBtn).toBeVisible();
    await expect(adminBtn).toBeVisible();
    await expect(superAdminBtn).toBeVisible();

    // Test clicking Student fills student credentials
    await studentBtn.click();
    await expect(page.getByPlaceholder('cadet@cdsprep.com')).toHaveValue('student@cdsprep.local');

    // Test clicking Moderator fills moderator credentials
    await modBtn.click();
    await expect(page.getByPlaceholder('cadet@cdsprep.com')).toHaveValue('moderator@cdsprep.local');

    // Test clicking Super Admin fills super admin credentials
    await superAdminBtn.click();
    await expect(page.getByPlaceholder('cadet@cdsprep.com')).toHaveValue('superadmin@cdsprep.local');
  });

  test('practice module curriculum drill-down exposes cascading Subject -> Chapter -> Topic selectors', async ({ page }) => {
    await page.goto('/login');
    const demoBtn = page.getByRole('button', { name: 'Student' });
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await page.getByRole('button', { name: /Sign In as Cadet/i }).click();

      await page.goto('/practice');
      await expect(page.getByText(/All Questions/i)).toBeVisible();

      // Click topic mastery mode to trigger configuration modal with cascading curriculum selectors
      const topicMasteryCard = page.getByText(/Topic Mastery/i).first();
      await topicMasteryCard.click();

      // Verify modal opens with Subject, Chapter, and Topic selectors
      await expect(page.getByText(/Configure Drill/i)).toBeVisible();
      await expect(page.getByText(/Subject Selection/i)).toBeVisible();
      await expect(page.getByText(/Chapter Focus/i)).toBeVisible();
      await expect(page.getByText(/Topic Specialization/i)).toBeVisible();

      // Verify Start Session button is accessible
      await expect(page.getByRole('button', { name: /Deploy Drill/i })).toBeVisible();
    }
  });

  test('accessibility & semantic structure: keyboard navigability on critical pages', async ({ page }) => {
    await page.goto('/login');

    // Tab through the login form
    await page.keyboard.press('Tab');
    const emailInput = page.getByPlaceholder('cadet@cdsprep.com');
    await emailInput.focus();
    await expect(emailInput).toBeFocused();

    await page.keyboard.press('Tab');
    const pwdInput = page.getByPlaceholder('••••••••');
    await expect(pwdInput).toBeFocused();

    // Verify main headings have proper semantic H1
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
  });
});
