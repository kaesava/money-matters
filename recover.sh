#!/usr/bin/env bash
set -euo pipefail

TAG_NAME="${1:-snapshot}"

if ! git rev-parse -q --verify "refs/tags/${TAG_NAME}" >/dev/null; then
  echo "❌ Error: Tag '${TAG_NAME}' does not exist."
  echo "Available snapshot tags:"
  git tag -l "snapshot*"
  exit 1
fi

TARGET_SHA=$(git rev-parse --short "${TAG_NAME}")
echo "⚠️ Recovering working tree to '${TAG_NAME}' (${TARGET_SHA})..."
echo "All uncommitted changes, staged changes, and untracked files will be wiped."

# Reset tracked files to the target tag commit
git reset --hard "${TAG_NAME}"

# Clean untracked files and directories, preserving the snapshot and recover scripts
git clean -fd -e snapshot.sh -e recover.sh

echo "✅ Working tree successfully recovered to '${TAG_NAME}' (${TARGET_SHA})."
git status --short
