#!/bin/sh
# Derive the reference envelopes. Creates a private virtualenv in the git-ignored cache on first
# use (numpy, scipy and nimblephysics, which reads AddBiomechanics .b3d files). Arguments pass to
# derive.py, for example --no-fetch, --limit 2, --only ui-prmd.
set -e
cd "$(dirname "$0")/../.."
VENV=.cache/motion-reference/venv
if [ ! -x "$VENV/bin/python" ]; then
  mkdir -p .cache/motion-reference
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install --quiet -r scripts/reference/requirements.txt
fi
exec "$VENV/bin/python" scripts/reference/derive.py "$@"
