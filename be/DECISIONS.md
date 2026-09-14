# Engineering Decisions

## 1. System Invariants
- Inventory must never be oversold or drop below zero.
- Prices must be exact; no floating-point arithmetic.
- Checked out carts cannot be modified or checked out again.
- An idempotency key must not execute business logic multiple times.

## 2. Cart State Transitions
- Carts start in `open` state.
- Upon successful checkout, cart transitions to `checked_out`.
- A `checked_out` cart cannot be modified. A new cart must be created for subsequent purchases.

## 3. Price-Change Semantics
- Product prices are dynamic and reflect the current catalog.
- Carts display current product prices.
- When an order is placed, the unit price of the item at that moment is permanently snapshotted into the `order_items` table.
- Future price changes to products do not affect historical orders or reports.

## 4. Inventory-Change Semantics
- Adding an item to a cart does not reserve inventory.
- Inventory is deducted exactly at the moment of checkout.
- Rollbacks due to payment/business failure restore inventory automatically by rolling back the transaction.

## 5. Coupon Milestone Semantics
- Every *Nth* (e.g. 5th) successfully placed order (status `paid`) unlocks one milestone.
- A milestone is eligible if `totalOrders >= milestoneNumber`.
- Each milestone can generate exactly one coupon.

## 6. Coupon Generation Semantics
- Generated manually via an administrator endpoint.
- Administrator defines the discount structure at generation.
- To prevent duplication, `milestone` is uniquely constrained in the `coupons` table.

## 7. Coupon Redemption Semantics
- Applied during the checkout transaction.
- Status atomically transitions from `available` to `redeemed`.
- It tracks the `redeemed_order_id` and timestamp.
- Rolled back automatically if checkout fails.

## 8. Transaction Strategy
- Checkout business logic is wrapped in a single explicit Sequelize transaction.
- If any operation fails (inventory, idempotency clash, coupon issue), the entire sequence aborts and rolls back.

## 9. Inventory Concurrency Strategy
- To prevent overselling, inventory is updated via atomic conditional queries:
  `UPDATE products SET inventory = inventory - quantity WHERE id = X AND inventory >= quantity;`
- If no rows are updated, it implies insufficient inventory, and the transaction is aborted.

## 10. Idempotency Strategy
- An idempotency record is created inside the main transaction or outside it. In our implementation, a unique constraint on `(user_id, key)` is strictly enforced.
- Concurrent requests using the same key will trigger a unique constraint error on the secondary request, returning a 409 Conflict.
- Successful checkouts mark the idempotency status as `completed`.
- Failed checkouts roll back the record, allowing the client to safely retry.

## 11. Money and Rounding Rules
- All money fields (`unit_price_minor`, `gross_amount_minor`, `discount_amount_minor`, `net_amount_minor`) are stored as integers representing minor currency units (e.g., cents, paise).
- Floating point calculation is strictly avoided.

## 12. Error Model and HTTP Status Mapping
- 400 Bad Request: Malformed JSON or schema validation failures.
- 404 Not Found: Resource (Cart, Product) missing.
- 409 Conflict: State conflicts (Cart already checked out, Idempotency key reused).
- 422 Unprocessable Entity: Business rules violations (Empty cart, Insufficient inventory, Invalid coupon).
- 500 Internal Server Error: Unhandled exceptions.

## 13. Persistence Choice
- PostgreSQL is used as the single source of truth for everything, including idempotency. No Redis or external caches are necessary for this scale.

## 14. Multiple-instance and Production Evolution
- The system relies entirely on DB-level locks and atomic updates, making it safe to run concurrently across multiple Lambda containers.
- Future scaling might involve partitioning the idempotency table or orders.

## 15. Implemented versus Deferred Functionality
- **Implemented**: Product browsing, complete Cart lifecycle, robust transactional Checkout, Admin Coupon Generation and Reporting, Error Handling.
- **Deferred**: Real payment integrations and Automated testing suites.

## 16. AI Usage
- Used AI to analyze existing schema, generate required SQL migrations (for coupon milestones), update Sequelize models, correctly implement checkout atomicity avoiding common locking pitfalls (e.g., outer join lock errors), and refactor endpoints.
- Avoided blindly trusting initial AI suggestions that used unsafe read-modify-write patterns for inventory, explicitly modifying them to atomic decrement updates.

## 17. Approximate Time Spent
- 1-2 hours depending on inspection and manual verification iterations.

## 18. What would be investigated with two additional hours
- Full automated test suite (unit, integration, concurrency simulations).
- Setting up a CI/CD pipeline.
- Implementing a realistic mock payment gateway abstraction.
## Reward Milestone Progress and History
- **Database Atomicity:** Used `INSERT ... ON CONFLICT DO NOTHING RETURNING id` in `RewardEvent` to deduplicate order reward events. Only if a row is returned (i.e. successfully inserted), `RewardAccount.successful_order_count` is incremented.
- **Milestone Coupons:** Users automatically receive a milestone coupon code embedded with their user ID and the current threshold (e.g. `REWARD-<USER_ID>-5-<RANDOM>`). Instead of modifying the unique `milestone` constraint in `coupons`, the milestone integer is stored as `NULL` on the coupon row for user milestones, relying solely on the coupon code string format to identify it.
