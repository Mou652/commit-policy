#!/bin/sh
set -eu
policy_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
exec node "$policy_root/scripts/check.mjs" commit-msg "$@"
