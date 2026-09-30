#!/bin/sh
set -eu
target=${1:-.}
command -v git >/dev/null 2>&1 || { echo '需要 Git' >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo '需要已有的 Node.js >= 22.12.0' >&2; exit 1; }
node -e 'const [a,b]=process.versions.node.split(".").map(Number);if(a<22||(a===22&&b<12))process.exit(1)' || { echo '需要 Node.js >= 22.12.0' >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo '需要 npm' >&2; exit 1; }
target=$(CDPATH= cd -- "$target" && pwd)
policy_cache="${XDG_CACHE_HOME:-$HOME/.cache}/mou652-commit-policy"
if [ -d "$policy_cache/.git" ]; then
  git -C "$policy_cache" pull --ff-only
elif [ -e "$policy_cache" ]; then
  echo "缓存目录已存在且不是规则仓库: $policy_cache" >&2
  exit 1
else
  mkdir -p "$(dirname -- "$policy_cache")"
  git clone --depth 1 --branch main https://github.com/Mou652/commit-policy.git "$policy_cache"
fi
exec node "$policy_cache/scripts/install.mjs" "$target"
