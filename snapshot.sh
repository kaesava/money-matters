#!/usr/bin/env bash
set -euo pipefail

TAG_NAME="${1:-snapshot}"

# Check if there are uncommitted tracked changes
if ! git diff-index --quiet HEAD --; then
  echo "⚠️ Warning: You have uncommitted changes in your working tree."
  echo "Tagging HEAD (${TAG_NAME}). Uncommitted changes will NOT be part of this snapshot."
fi

# Create/update tag pointing to HEAD
git tag -f "${TAG_NAME}" HEAD

COMMIT_SHA=$(git rev-parse --short HEAD)
echo "✅ Snapshot created: tag '${TAG_NAME}' pointing to commit ${COMMIT_SHA}."
