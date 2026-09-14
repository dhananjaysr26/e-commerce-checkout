import { test, expect } from '@playwright/test';

test.describe('E-Commerce Checkout Flow', () => {
  test('User can browse products, add to cart, and checkout', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    // Navigate to homepage
    await page.goto('/');

    // Ensure we are on the homepage with products loaded
    await expect(page.locator('h1').getByText('Product Catalog')).toBeVisible();

    // Verify products are loaded
    const productCards = page.locator('button:has-text("Add to Cart")');
    await expect(productCards.first()).toBeVisible();

    // Add first product to cart
    await productCards.first().click();

    // Wait for the checkout area to appear/update
    await expect(page.getByText('Shipping and taxes calculated at checkout')).toBeVisible();

    // The subtotal should be updated
    const checkoutButton = page.locator('button:has-text("Checkout")');
    await expect(checkoutButton).toBeVisible();

    // Click checkout
    await checkoutButton.click();

    // Expect processing state then success
    await expect(page.locator('button:has-text("Processing...")')).toBeVisible();
    await expect(page.getByText('Checkout Successful!')).toBeVisible({ timeout: 10000 });
    
    // Check if the order ID is displayed
    await expect(page.getByText('Order ID:')).toBeVisible();
  });
});
