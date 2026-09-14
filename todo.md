# E-Commerce Checkout Assignment - TODO

This document tracks the remaining work required to complete the assignment and make it ready for submission.

## P0 — Must Fix Before Submission (Correctness & Core Logic)
- [ ] **Fix Checkout Schema Mismatches**: 
  - Update `checkout.service.js` to use correct DB enum statuses (e.g. `open` instead of `active`, `checked_out` instead of `converted`).
  - Fix property names (use `product.unitPriceMinor` instead of `product.price`).
  - Pass missing required fields to `Order.create()` (e.g., `cartId`, `grossAmountMinor`, `discountAmountMinor`, `netAmountMinor`).
  - Fix `OrderItem` snapshot to map `unitPriceMinor` and `lineTotalMinor`.
- [ ] **Fix Idempotency & Rollback Poisoning**:
  - Update `idempotency.js` to pass `userId`, `cartId`, and `requestHash` which are `allowNull: false` in the DB.
  - Clear or fail the idempotency key if the checkout throws an error (so failed checkouts do not permanently lock out retries).
- [ ] **Implement Coupon Logic**:
  - Remove the hardcoded "reward points" logic from checkout.
  - Implement the requirement: Generate one coupon for every eligible successful-order milestone (e.g., *n* orders or *x* amount).
  - Ensure duplicate generation for the same milestone is prevented.
  - Ensure safe coupon redemption logic (link redemption to user/order so it can't be reused infinitely).
- [ ] **Implement Admin Reporting**:
  - Create `BE/src/handlers/admin/report.js`.
  - Implement read-only SQL aggregations for sales, revenue, discounts, and coupon stats.

## P1 — Strongly Recommended (Tests, Docs & Edge Cases)
- [ ] **Write Concurrency Tests**:
  - Write a Vitest test firing two simultaneous checkouts against a product with 1 inventory to prove pessimistic locking prevents overselling.
- [ ] **Write Idempotency & Rollback Tests**:
  - Test that retrying with the same idempotency key returns the cached successful response.
  - Test that a failed checkout (e.g., due to low inventory) rolls back and allows a retry.
- [ ] **Update DECISIONS.md**:
  - Add the required "AI Usage" section.
  - Document behavior when a product price changes after it was added to the cart.
  - Document the error model and HTTP status code mappings.
- [ ] **Add Remove Cart Item Endpoint**:
  - Implement `DELETE /carts/:cartId/items/:productId`.

## P2 — Nice to Have (Polish)
- [ ] **Frontend Checkout Integration**:
  - Connect the "Checkout" button in the React UI to the backend `/checkout` endpoint.
  - Display success state and order confirmation.
- [ ] **Git Commits**:
  - Keep future commits atomic and feature-specific (e.g., "fix: resolve checkout schema mismatch", "feat: admin reporting").
