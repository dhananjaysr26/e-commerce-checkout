# Architecture

## Overview
This is a Serverless application deployed on AWS via the Serverless Framework. It provides a RESTful API for an e-commerce checkout and rewards system.

## Request Flow

```text
React (Frontend)
  ↓
Redux Toolkit (State)
  ↓
REST API (Fetch)
  ↓
API Gateway
  ↓
Lambda (Handler)
  ↓
Services (Business Logic)
  ↓
Repositories (Data Access)
  ↓
Sequelize
  ↓
PostgreSQL
```

## Stack
- **Compute:** AWS Lambda via API Gateway (handled by `serverless-http` and Express)
- **Database:** PostgreSQL (transactional source of truth)
- **ORM:** Sequelize
- **Validation:** Zod
- **Testing:** Vitest

## Design Decisions

1. **Native Serverless Handlers**
   - We route traffic explicitly via `serverless.yml` to native AWS Lambda functions. We avoid heavy web frameworks like Express.
   - *Why?* Better cold-start performance and reduced memory footprint. Middleware is implemented via higher-order functions wrapping the native `(event, context)` handlers.

2. **Database Source of Truth**
   - PostgreSQL is the sole data store.
   - We avoid adding Redis, Kafka, or other distributed systems to keep infrastructure simple, robust, and strongly consistent.
   - *Why?* Adding distributed queues or caches introduces eventual consistency, network latency, and operational overhead. Postgres handles our concurrency needs well enough via row-level locking.

3. **Concurrency and Safety**
   - We use Database Transactions and Row-Level Locking (`SELECT ... FOR UPDATE` via `t.LOCK.UPDATE` in Sequelize) to ensure multiple concurrent checkouts cannot overdraw inventory or reuse a single-use coupon.
   - An `IdempotencyKey` table ensures that API requests with the same `x-idempotency-key` are safely handled even on retries, preventing double charges.

4. **Authentication**
   - JWT-based authentication via a custom middleware. In production, this would be swapped out for Amazon Cognito integrated directly at the API Gateway level to reduce Lambda invocations for unauthorized requests.

5. **Error Handling**
   - Centralized error handling using a custom `AppError` class.
   - Maps specific domain errors to appropriate HTTP status codes and internal error codes (e.g. `INSUFFICIENT_INVENTORY`).
