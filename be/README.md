# Reliable Checkout and Rewards Service

A production-grade, highly reliable backend for e-commerce checkouts.

## Key Features
- Transactional integrity using PostgreSQL.
- Idempotency guarantees for the checkout API to prevent double-charging.
- Row-level locking to prevent inventory overdraws.
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

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server (simulates API Gateway and Lambda locally):
   ```bash
   npm run dev
   ```
   *The server will be available at `http://localhost:8000`.*

### Testing
Run unit and integration tests using Vitest:
```bash
npm test
```

## Documentation
- `docs/ARCHITECTURE.md` - Overall system architecture.
- `docs/DECISIONS.md` - Key engineering trade-offs and choices.
- `openapi.yaml` - REST API specification.
