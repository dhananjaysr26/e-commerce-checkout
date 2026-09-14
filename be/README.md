# Reliable Checkout and Rewards Service

A production-grade, highly reliable backend for e-commerce checkouts.

## Key Features
- Transactional integrity using PostgreSQL.
- Idempotency guarantees for the checkout API to prevent double-charging.
- Atomic row-level updates to prevent inventory overselling.
- Milestone-based coupon generation and transactional redemption.
- Immutable order snapshots.
- Serverless architecture utilizing AWS Lambda (via Serverless Framework).

## Local Development

### Prerequisites
- Node.js 20+
- Docker & Docker Compose

### Setup

1. Start the PostgreSQL infrastructure:
   ```bash
   cd ../infra
   docker compose up -d
   ```

2. Copy `.env.example` to `.env` and configure it:
   ```bash
   cp .env.example .env
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Database Setup:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
   *To completely reset the database, run `npm run db:reset`.*

5. Run the development server (simulates API Gateway and Lambda locally):
   ```bash
   npm run dev
   ```
   *The server will be available at `http://localhost:8000`.*

### Completed Functionality
- **Products and Inventory**: Complete endpoints for products.
- **Cart Lifecycle**: Complete flow for creating carts, adding/updating/removing items.
- **Transaction-safe Checkout**: Checkout logic is completely safe from concurrent data races and handles transactional rollback effectively.
- **Inventory Concurrency**: Prevents overselling using atomic Postgres updates (`inventory = inventory - :quantity WHERE inventory >= :quantity`).
- **Idempotency**: Prevents duplicate charges by saving checkout state based on a unique client key. Retry requests safely return the earlier result.
- **Coupons & Rewards**: Milestone-based coupon generation API and safe one-time redemption during checkout.
- **Reporting**: Read-only admin report reflecting accurate aggregates based on order snapshots.

### Deferred Functionality
- Automated testing will be implemented in the next phase.

## API Documentation
Refer to `openapi.yaml` for complete API documentation.

## Decisions
Refer to `DECISIONS.md` for engineering trade-offs and choices.
