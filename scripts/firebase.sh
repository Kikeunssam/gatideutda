#!/bin/sh
# Use the project-local Firebase CLI without a global installation.
set -eu
cd "$(dirname "$0")/.."
runtime_node="/Users/mysonrami/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
if command -v node >/dev/null 2>&1; then
  runtime_node="$(command -v node)"
fi
exec "$runtime_node" .tools/firebase/node_modules/firebase-tools/lib/bin/firebase.js "$@"
