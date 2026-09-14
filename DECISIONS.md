# Architecture and Design Decisions

This document outlines the core architectural and business decisions made while implementing the E-Commerce Checkout and Rewards Service.

---

## 1. System Invariants
- **Inventory Protection:** Inventory must never drop below zero. An order cannot be created if inventory is insufficient.
- **Cart Immutability:** Once a cart is checked out (`status = 'checked_out'`), it cannot be mutated or checked out again.
- **Idempotency Guarantee:** A unique idempotency key must execute the checkout transaction exactly once, creating at most one order.
- **Reward Exactness:** A successful order increments the user's reward progress exactly once.
- **Coupon Uniqueness:** A milestone coupon is generated exactly once per milestone reached. A coupon can be redeemed exactly once.
- **Financial Exactness:** Net Amount = Gross Amount - Discount. Net amount can never be negative. Prices and totals must be stored losslessly without floating-point inaccuracies.

## 2. Ambiguities Found & Semantics Selected
- **Ambiguity:** What happens if a product's price changes while it sits in a user's cart?
  - **Selected Semantics:** The cart always reflects the *live* catalog price. At the exact moment of checkout, the current unit price is permanently snapshotted into the `order_items` table. Future price changes will not affect historical orders or administrative reports.
- **Ambiguity:** Are rewards based on *purchased items* or *successful orders*?
  - **Selected Semantics:** The assignment says "every nth successfully placed order". Therefore, placing an order containing 5 items counts as **1 successful order** towards the milestone, not 5.
- **Ambiguity:** Does a failed payment consume a coupon?
  - **Selected Semantics:** No. Coupon redemption is wrapped tightly inside the main checkout database transaction. If the transaction rolls back due to insufficient inventory or simulated payment failure, the coupon remains `AVAILABLE`.

---

## 3. Material Design Decisions

### Decision: Idempotency Concurrency Control
**Context:** We needed to ensure that two perfectly concurrent checkout requests using the exact same idempotency key don't both read an empty state and execute duplicate checkouts.
**Options considered:** 
1. Use an in-memory lock (mutex).
2. Use a Redis distributed lock.
3. Use a PostgreSQL unique constraint with a pre-flight insert.
**Choice:** We chose the PostgreSQL unique constraint on the `idempotency_keys` table `(user_id, key)`.
**Why:** In-memory locks fail across multiple Lambda/Serverless instances. Redis introduces unnecessary infrastructure complexity for this scale. Letting the ACID database handle the lock via a unique constraint natively prevents race conditions instantly.
**Consequences:** The architecture remains completely stateless and relies purely on the database. It is slightly harder to return a custom error message on constraint violation without parsing the DB error, but it guarantees correctness.

### Decision: Inventory Decrement Strategy
**Context:** Deducting inventory can lead to race conditions (overselling) if two users read the available stock simultaneously and then both write the updated value.
**Options considered:**
1. Read -> Check -> Write (Unsafe).
2. `SELECT ... FOR UPDATE` row locks.
3. Atomic conditional `UPDATE` statements.
**Choice:** Atomic conditional updates: `UPDATE products SET inventory = inventory - qty WHERE id = X AND inventory >= qty`.
**Why:** It delegates the mathematical verification and concurrency queuing entirely to the PostgreSQL engine. If the stock is insufficient, the query effortlessly returns `0` modified rows, allowing the application code to safely abort. It prevents deadlocks that explicit row locks might introduce.
**Consequences:** Extremely high throughput and guaranteed safety without locking the table. Deferred complexity is that we must check the `rowCount` metadata carefully to detect insufficient stock.

### Decision: Reward History Tracking
**Context:** We needed a reliable way to track how many successful orders a user has placed to generate milestone coupons, without losing increments under load.
**Options considered:**
1. A simple integer counter column on the `users` table.
2. An append-only event ledger table (`reward_events`).
3. A hybrid approach: A fast projection counter (`reward_accounts`) backed by an immutable ledger (`reward_events`).
**Choice:** The hybrid approach (Fast projection + Immutable ledger).
**Why:** A simple counter is prone to lost updates and cannot be audited. An append-only table is perfectly auditable but slow to count for every API request. The hybrid approach provides millisecond reads via the counter, while the ledger provides a guaranteed audit trail and deduplication (via `ON CONFLICT DO NOTHING`).
**Consequences:** Increased schema complexity (requires two tables), but we gain complete confidence that rewards are never duplicated and can be reconciled financially.

### Decision: Database Transaction Boundary
**Context:** Checkout involves inventory deduction, cart updates, idempotency state, order creation, and reward increments.
**Options considered:**
1. Multiple small transactions.
2. A single monolithic PostgreSQL transaction wrapping the entire sequence.
3. An event-driven saga pattern (Kafka/SQS).
**Choice:** A single monolithic PostgreSQL transaction.
**Why:** For this scale, synchronous ACID transactions are by far the safest and simplest implementation. If the reward generation fails at step 10, the inventory deduction from step 1 rolls back effortlessly. An event-driven saga would require complex dead-letter queues and manual compensating transactions.
**Consequences:** The checkout API call holds a database connection slightly longer. If external network calls (e.g., real Stripe API) are added later, this transaction boundary must be split, as holding a DB lock during a network call is an anti-pattern.

### Decision: Coupon Lifecycle Management
**Context:** Coupons need to be strictly scoped to the user who earned them and must transition gracefully from earned to redeemed without race conditions.
**Options considered:**
1. Delete the coupon row upon redemption.
2. Maintain a `status` enum (`AVAILABLE`, `REDEEMED`) and associate a `user_id`.
**Choice:** Maintain a `status` enum, add `user_id` to the `coupons` table, and use an atomic status transition query during checkout.
**Why:** Deleting coupons ruins historical data and administrative reports. Using an atomic update (`UPDATE coupons SET status = 'redeemed' WHERE code = X AND status = 'available' AND user_id = Y`) provides race-condition protection if a user double-clicks the checkout button, while preserving the paper trail.
**Consequences:** The UI can easily query `GET /me/coupons` for `AVAILABLE` coupons. The database retains a permanent record of who redeemed what, and when.

---

## 4. Cross-Cutting Concerns

### Transaction, Concurrency, and Idempotency Strategy
The system relies exclusively on PostgreSQL for state coordination. 
- **Idempotency:** A pre-flight write to the `idempotency_keys` table guarantees only one execution per key. 
- **Concurrency:** The Cart row is explicitly locked (`SELECT FOR UPDATE`) to serialize checkout requests for the same cart. Inventory and coupon redemptions utilize atomic conditional updates (`UPDATE...WHERE`) to gracefully reject parallel requests fighting for the last available unit.

### Money and Rounding Rules
All monetary fields are strictly modeled as integers representing minor currency units (e.g., cents, paise).
- Floating-point `DECIMAL` or `FLOAT` column types and Javascript math are **strictly forbidden**.
- E.g., $10.99 is stored and computed as `1099`.
- Discounts are applied via integer division (`Math.floor((grossAmountMinor * percentage) / 100)`), preventing fractional cent anomalies.

### Error-Model Choices
The API surfaces meaningful HTTP status codes paired with detailed JSON payloads:
- `400 Bad Request`: Schema validation failures (e.g. quantity = 0).
- `404 Not Found`: Resources missing.
- `409 Conflict`: Concurrency collisions (Idempotency clash, Cart already checked out).
- `422 Unprocessable Entity`: Business invariant violations (Insufficient inventory, invalid coupon).

### Implemented vs. Deferred
- **Implemented:** Full ACID cart checkout, robust idempotency, dynamic reward generation, append-only ledgers, E2E integrations, and comprehensive concurrency test suites.
- **Deferred:** Real third-party payment integrations (Stripe) and complex shipping/tax estimation logic. We simulate payment success as part of the transaction.

### Scaling to Multiple Instances & Production
Because the system deliberately avoids in-memory locks, Node.js state, and process-level singletons, it is instantly horizontally scalable. You can safely deploy 500 instances of the Serverless Lambda concurrently. PostgreSQL handles the serialization via row locks and ACID guarantees. At massive scale, the monolithic transaction could be evolved into a Transactional Outbox pattern utilizing Apache Kafka to asynchronously process rewards without tying up checkout latency.

### AI Tool Usage
AI agents (Harness Engineering) were extensively utilized to rapidly scaffold test cases, generate initial Sequelize models, and simulate extreme concurrency edge cases during integration testing. 
- **Material Redirection Example:** Initially, the AI subagent wrote a test asserting that if a coupon is generated, the `Coupon` model tracks the user. However, upon code inspection, I discovered the AI had failed to include a `user_id` foreign key in the `Coupon` table migration, making it impossible to restrict redemption natively. I actively intervened, generated a new structural migration (`add-user-id-to-coupons`), rewrote the checkout SQL queries to strictly check `user_id = :userId`, and wrote the missing `GET /me/coupons` endpoint.

### What to examine given another two hours
1. Implement a true "Transactional Outbox" pattern for the Reward logic to demonstrate asynchronous event-driven resilience.
2. Containerize the entire environment with a unified `docker-compose.yml` to remove local Node.js version dependencies.
3. Hook up a mocked external payment gateway simulating network latency and temporary 503 errors to prove the idempotency resilience against real-world network jitter.
