import { test, expect } from '@playwright/test';

test.describe('Authentication & Access Flows', () => {
  test('displays cadet sign-in page with quick demo login buttons', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /Cadet Sign In/i })).toBeVisible();
    await expect(page.getByPlaceholder('cadet@cdsprep.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();

    // Verify Quick Demo Access box
    await expect(page.getByText(/Quick Demo Access/i)).toBeVisible();
  });

  test('validates required fields on empty submit', async ({ page }) => {
    await page.goto('/login');
    const submitBtn = page.getByRole('button', { name: /Sign In as Cadet/i });
    await submitBtn.click();

    // Email input HTML5 validation should trigger
    const emailInput = page.getByPlaceholder('cadet@cdsprep.com');
    await expect(emailInput).toBeFocused();
  });

  test('displays cadet registration page and enforces password criteria', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByRole('heading', { name: /Cadet Enlistment/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Vikram Singh/i)).toBeVisible();
    await expect(page.getByPlaceholder('cadet@example.com')).toBeVisible();

    // Fill short password
    const pwdInput = page.getByPlaceholder('Create strong password');
    await pwdInput.fill('short');

    // Password criteria indicators should show unmet
    await expect(page.getByText('8+ characters')).toBeVisible();
  });

  test('navigates to forgot password and reset flows', async ({ page }) => {
    await page.goto('/forgot-password');

    await expect(page.getByRole('heading', { name: /Reset Password/i })).toBeVisible();
    await expect(page.getByPlaceholder('cadet@cdsprep.com')).toBeVisible();
    await expect(page.getByRole('button', { name: /Send Reset Link/i })).toBeVisible();
  });
});
