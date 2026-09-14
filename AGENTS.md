# AGENTS.md — Testing Harness

This repository is set up for multi-agent workflows using Harness Engineering. Durable state lives in files, not chat:
- `feature_list.json` — machine-readable state of record.

> Agents cannot see chat scrollback or each other's context. `feature_list.json` is the shared memory. Read it at startup; write to it when done.

## Startup Workflow
1. Read `AGENTS.md` and `feature_list.json`.
2. Pick the target testing feature marked `in_progress`.
3. Read the codebase to understand what needs to be tested.

## Working Rules
- The current phase is dedicated strictly to automated testing (unit, integration, concurrency, idempotency).
- Tests should be placed in `be/tests/`.
- Use the existing framework (`vitest` + `supertest`) as defined in `be/package.json`.
- Add/update tests for the target feature.
- Verify the tests pass by running `npm run test` inside the `be/` folder.
- Do not mark a feature complete just because tests were added; they must execute and pass.
- Log evidence of successful test execution in `feature_list.json`.

## Subagent Protocol
The `tester` subagent writes and runs tests for ONE feature, and records the results as evidence.
