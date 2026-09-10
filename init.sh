#!/usr/bin/env bash
# Standard startup + verification path for CopilotCA (Harness Engineering).
# Runs from anywhere — it cd's to the repo root (this script's directory).
#
#   ./init.sh                     # sync deps + run baseline verification for what's scaffolded
#   RUN_START_COMMAND=1 ./init.sh # also launch dev servers for scaffolded folders (best-effort)
#
# Each of marketing-website/, web-app/, backend/ is verified only if it has a
# recognizable project manifest; empty/not-yet-scaffolded folders are skipped.
# When devops scaffolds a folder, keep this script + feature_list.json.verification_paths
# in sync.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"
echo "==> Working directory: $PWD"

# verify_folder <name> — detect the stack in a folder and run its verification gate.
verify_folder() {
  local dir="$1"

  if [ ! -d "$dir" ]; then
    echo "==> $dir: folder missing — skipping"
    return 0
  fi

  if [ -f "$dir/package.json" ]; then
    echo "==> $dir: Node project detected — installing deps"
    (cd "$dir" && npm install --no-fund --no-audit)
    if [ -f "$dir/tsconfig.json" ]; then
      echo "==> $dir: type-check (tsc)"
      (cd "$dir" && npx tsc --noEmit)
    fi
    if npm --prefix "$dir" run 2>/dev/null | grep -qE '^  lint'; then
      echo "==> $dir: lint (advisory)"
      (cd "$dir" && npm run lint) || echo "    ($dir lint reported issues — see above; not blocking baseline)"
    fi
    if npm --prefix "$dir" run 2>/dev/null | grep -qE '^  test'; then
      echo "==> $dir: tests"
      (cd "$dir" && npm test --silent)
    fi
    if npm --prefix "$dir" run 2>/dev/null | grep -qE '^  build'; then
      echo "==> $dir: build (npm run build)"
      (cd "$dir" && npm run build)
    fi
    echo "==> $dir: OK"
    return 0
  fi

  if [ -f "$dir/pyproject.toml" ]; then
    echo "==> $dir: Python project detected"
    if [ ! -d "$dir/.venv" ]; then
      echo "==> $dir: creating venv ($dir/.venv)"
      python3 -m venv "$dir/.venv"
    fi
    echo "==> $dir: syncing dependencies"
    (cd "$dir" && .venv/bin/pip install -e ".[dev]" -q) || (cd "$dir" && .venv/bin/pip install -e . -q)
    if (cd "$dir" && .venv/bin/ruff --version >/dev/null 2>&1); then
      echo "==> $dir: lint (ruff)"
      (cd "$dir" && .venv/bin/ruff check .) || echo "    ($dir ruff reported issues — see above)"
    fi
    if (cd "$dir" && .venv/bin/pytest --version >/dev/null 2>&1); then
      echo "==> $dir: tests (pytest)"
      (cd "$dir" && .venv/bin/pytest -q)
    fi
    echo "==> $dir: OK"
    return 0
  fi

  echo "==> $dir: not scaffolded yet — skipping"
  return 0
}

for folder in BE web; do
  verify_folder "$folder"
done

echo ""
echo "==> Baseline verification complete."
echo "    Full per-folder gates (incl. marketing 'npm run build') live in"
echo "    feature_list.json.verification_paths; this script runs the fast baseline"
echo "    (lint/type-check/tests) per scaffolded folder and skips empty ones."

if [ "${RUN_START_COMMAND:-0}" = "1" ]; then
  echo "==> RUN_START_COMMAND=1 — dev-server launch is per-folder and set up by devops once scaffolded."
fi
