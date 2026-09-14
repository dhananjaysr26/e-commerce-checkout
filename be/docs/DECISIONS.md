# Engineering Decisions

## 1. No NoSQL / Caching Layer
**Context:** We need to handle high concurrency during checkout. Many architectures reach for Redis for idempotency or inventory locking.
**Decision:** We use PostgreSQL for everything (idempotency, inventory locking).
**Rationale:** Postgres is extremely capable of handling high concurrency with proper row-level locking. Introducing Redis increases operational burden, potential data desynchronization (cache invalidation issues), and deployment complexity. Correctness > Infrastructure complexity.

## 2. Optimistic vs Pessimistic Locking
**Context:** Inventory can be contested by multiple checkouts simultaneously.
**Decision:** We use pessimistic locking (`SELECT FOR UPDATE`) during the checkout transaction.
**Rationale:** Pessimistic locking prevents read-modify-write race conditions at the database level. For inventory, where precise tracking is critical, locking the row during the brief transaction ensures absolute consistency. It is simpler than implementing application-side optimistic retry loops.

## 3. Idempotency Implementation
**Context:** Network issues can cause clients to retry checkout requests. We must not double-charge or double-deduct inventory.
**Decision:** An explicit `IdempotencyKey` table in PostgreSQL.
**Rationale:** Using a database table allows us to wrap the idempotency check and the business logic in separate or identical transactional boundaries. We track the `status` of the key (`started`, `completed`, `failed`). If a key is `started`, concurrent requests fail immediately with a 409 Conflict. If `completed`, the cached response is returned.

## 4. Native AWS Lambda Handlers vs Lambdalith
**Context:** We can use Express wrapped in `serverless-http` or write native AWS Lambda handlers.
**Decision:** We are using native AWS Lambda handlers and mapping each endpoint explicitly in `serverless.yml`.
**Rationale:** Native handlers avoid the performance overhead of loading Express.js and simulating HTTP requests inside the Lambda container. By using higher-order functions for middleware (like `withAuth` and `withErrorHandler`), we maintain clean architecture and code reuse without the bulk of a web framework, fully embracing the Serverless paradigm natively.

## 10. Product Catalog and Cart Additions (Commit 2)
1. **Inventory is not reserved on add to cart:** Adding an item to the cart does not decrement inventory in the database. Inventory is strictly validated during checkout. This prevents malicious actors from locking up inventory simply by adding items to their carts.
2. **One Active Cart:** Users are limited to a single `OPEN` cart, enforced by a partial unique index in PostgreSQL (`UNIQUE(user_id) WHERE status = 'open'`).
3. **Cart Item Upserts:** Adding an existing product to a cart increments its quantity rather than creating duplicate `cart_items` rows.
4. **Temporary Auth Context:** Since authentication is slated for a future milestone, the API temporarily identifies all incoming requests as a seeded Demo User ("Alice") to maintain a strict linkage between Users and Carts.
