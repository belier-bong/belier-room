#!/bin/zsh
# BELIER 분석실(Claude 앱용) 설치·업데이트 — 맥 터미널에 한 줄:
#   curl -fsSL https://raw.githubusercontent.com/belier-bong/belier-room/main/install.sh | zsh
# 하는 일: 실행 도구(Node) 준비 → '데스크탑 › 프로젝트 › belier-분석실' 깔기 → 접속 키 넣기 → 작업 규칙·데이터 사전 받기 → 연결 확인.
# 관리자 비밀번호 필요 없음. 모든 파일은 내 홈 폴더 안에만. 다시 실행하면 도구만 새로 바꾸고 내가 만든 보고서·쿼리는 그대로.
# 접속 키는 이 저장소에 없습니다(봉주에게 따로 받음). AirDrop 으로 받은 'belier-key.txt' 가 다운로드·데스크탑에 있으면 자동으로 찾습니다.
set -e
APP="$HOME/.belier-data"
ROOM="$HOME/Desktop/프로젝트/belier-분석실"
REPO_TGZ="https://codeload.github.com/belier-bong/belier-room/tar.gz/refs/heads/main"
fail() { echo ""; echo "✗ $1"; echo "  이 화면을 사진 찍어 봉주에게 보내 주세요."; exit 1; }
echo "=== BELIER 분석실 설치 ==="

# 1) 실행 도구(Node 18 이상): 있으면 쓰고, 없으면 홈 폴더에만 내려받는다
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
NODE="$(command -v node || true)"
if [ -n "$NODE" ] && [ "$("$NODE" -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)" -lt 18 ]; then NODE=""; fi
if [ -n "$BELIER_FORCE_NODE" ] || [ -z "$NODE" ]; then
  NODE="$APP/node/bin/node"
  if [ ! -x "$NODE" ]; then
    echo "1) 실행 도구를 내려받습니다(1~2분)…"
    case "$(uname -m)" in arm64) ARCH=arm64 ;; *) ARCH=x64 ;; esac
    BASE="https://nodejs.org/dist/latest-v22.x"
    SUMS="$(curl -fsSL "$BASE/SHASUMS256.txt")" || fail "인터넷 연결을 확인해 주세요."
    LINE="$(echo "$SUMS" | grep "darwin-$ARCH.tar.gz" | head -1)"; FILE="${LINE##* }"; WANT="${LINE%% *}"
    [ -n "$FILE" ] || fail "실행 도구 파일을 찾지 못했습니다."
    TMP="$(mktemp -d)"
    curl -fsSL "$BASE/$FILE" -o "$TMP/node.tgz" || fail "실행 도구 다운로드 실패."
    [ "$(shasum -a 256 "$TMP/node.tgz" | cut -d' ' -f1)" = "$WANT" ] || fail "내려받은 파일이 손상됐습니다. 다시 실행해 주세요."
    rm -rf "$APP/node"; mkdir -p "$APP/node"; tar -xzf "$TMP/node.tgz" -C "$APP/node" --strip-components 1; rm -rf "$TMP"
  fi
fi
export PATH="$(dirname "$NODE"):$PATH"
echo "1) 실행 도구 준비됨 ($("$NODE" -v))"

# 2) 도구 받기(이 저장소 최신본) → 분석실 폴더
SRC="$(mktemp -d)"
curl -fsSL "$REPO_TGZ" | tar -xz -C "$SRC" --strip-components 1 || fail "설치 파일을 받지 못했습니다(인터넷 확인)."
mkdir -p "$ROOM/reports" "$ROOM/sql" "$ROOM/docs" "$ROOM/scripts" "$ROOM/.claude"
cp "$SRC/room/package.json" "$SRC/room/.gitignore" "$ROOM/"
cp "$SRC/room/scripts/"*.mjs "$SRC/room/scripts/"*.sh "$ROOM/scripts/"
cp "$SRC/room/.claude/settings.json" "$ROOM/.claude/"
chmod +x "$ROOM/scripts/"*.sh
echo "$NODE" > "$ROOM/scripts/.node"
rm -rf "$SRC"
echo "2) 분석실 폴더: $ROOM"
"$(dirname "$NODE")/npm" install --prefix "$ROOM" --no-audit --no-fund --loglevel=error >/dev/null 2>&1 || fail "조회 프로그램 설치 실패(인터넷 확인)."

# 3) 접속 키: 이미 있으면 그대로 → 다운로드·데스크탑의 'belier-key*.txt' → 직접 붙여넣기
if grep -q '^DATABASE_URL=postgresql://team_ro' "$ROOM/.env" 2>/dev/null; then
  echo "3) 접속 키: 이미 있음"
else
  # AirDrop 으로 받은 키 파일(가장 최근 것). 이름은 belier-key.txt(같은 이름이 있으면 'belier-key 2.txt' 처럼 받아짐)
  CANDS=( "$HOME"/Downloads/belier-key*.txt(N.om) "$HOME"/Desktop/belier-key*.txt(N.om) "$HOME"/Downloads/접속키*.txt(N.om) )
  KEYF="${CANDS[1]}"
  if [ -n "$KEYF" ]; then URL="$(tr -d '\r\n ' < "$KEYF")"; else
    echo "3) 봉주에게 받은 접속 키를 붙여넣고 Enter (화면에 보이지 않습니다)"
    read -rs "URL?   키: " < /dev/tty; echo
  fi
  [[ "$URL" == postgresql://team_ro.* ]] || fail "접속 키가 아닙니다(봉주에게 다시 받아 주세요)."
  ( umask 077; printf 'DATABASE_URL=%s\n' "$URL" > "$ROOM/.env" )
  [ -n "$KEYF" ] && rm -f "$KEYF"   # 받은 키 파일은 분석실에 옮겨 넣고 지운다
  echo "3) 접속 키를 넣었습니다."
fi

# 4) 작업 규칙·데이터 사전·저장 쿼리(DB에서) → 5) 연결 확인
"$NODE" "$ROOM/scripts/sync.mjs" || fail "작업 규칙을 받지 못했습니다(접속 키 확인)."
zsh "$ROOM/scripts/q.sh" "select count(*) from sales.mv_reorder" >/dev/null 2>&1 || fail "데이터 연결 확인 실패."
echo "5) 연결 확인 완료 — 데이터를 읽을 수 있습니다."

echo ""
echo "✓ 설치 끝."
if [ ! -d "/Applications/Claude.app" ] && [ ! -d "$HOME/Applications/Claude.app" ]; then
  echo "  Claude 앱이 없어서 다운로드 페이지를 엽니다 — 설치하고 로그인해 주세요."; open "https://claude.ai/download"
fi
echo "  Claude 앱 › Code 탭 › 새 세션 › 폴더 '데스크탑 › 프로젝트 › belier-분석실' 을 고르고 한국어로 물어보세요."
echo "  예) \"지난주 채널별 매출 엑셀로 만들어줘\""
open "$ROOM"
