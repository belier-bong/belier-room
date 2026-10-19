#!/bin/zsh
# 설치 때 받은 실행 도구(Node)로 scripts/q.mjs 를 실행한다. 하루 한 번 작업 규칙·데이터 사전을 최신으로 맞춘다.
DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE="$(cat "$DIR/scripts/.node" 2>/dev/null)"; [ -x "$NODE" ] || NODE="$(command -v node)"
[ -n "$NODE" ] || { echo "실행 도구가 없습니다 — 설치 명령을 다시 실행해 주세요." >&2; exit 1; }
[ "$(cat "$DIR/scripts/.synced" 2>/dev/null)" = "$(TZ=Asia/Seoul date +%F)" ] || "$NODE" "$DIR/scripts/sync.mjs" --quiet
exec "$NODE" "$DIR/scripts/q.mjs" "$@"
