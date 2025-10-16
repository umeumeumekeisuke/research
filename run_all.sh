#!/usr/bin/env bash
# =========================================
# プロジェクト起動スクリプト
# backend(FastAPI) と frontend(React) を同時に起動
# 仮想環境: ~/.venv を使用
# =========================================

set -Eeuo pipefail

# === 設定 ===
BACKEND_HOST="127.0.0.1"
BACKEND_PORT="8000"
FRONTEND_PORT="5173"
VENV_PATH="$HOME/.venv"

echo "🔧 Backend と Frontend を同時に起動します..."
echo "---------------------------------------------"

# ===== Backend 起動 =====
echo "🚀 Backend を起動中..."
pushd backend >/dev/null

# 仮想環境を有効化
if [[ -f "$VENV_PATH/bin/activate" ]]; then
  # shellcheck disable=SC1090
  source "$VENV_PATH/bin/activate"
  echo "✅ 仮想環境 ($VENV_PATH) を有効化しました。"
else
  echo "⚠️ 仮想環境が見つかりません: $VENV_PATH"
  echo "  → 'python3 -m venv ~/.venv' を実行して作成してください。"
  exit 1
fi

# FastAPI起動
python -m uvicorn main:app --reload --host "$BACKEND_HOST" --port "$BACKEND_PORT" &
BACKEND_PID=$!
popd >/dev/null

# ===== Frontend 起動（ポート重複チェック）=====
echo "💻 Frontend を起動中..."
if lsof -ti:$FRONTEND_PORT >/dev/null 2>&1; then
  echo "⚠️ Port $FRONTEND_PORT がすでに使われています。既存プロセスを終了します..."
  kill -9 $(lsof -ti:$FRONTEND_PORT) || true
fi

pushd frontend >/dev/null
npm install --silent
npm run dev -- --port "$FRONTEND_PORT" --strictPort &
FRONTEND_PID=$!
popd >/dev/null

# ===== 案内 =====
echo "---------------------------------------------"
echo "✅ Backend(PID=$BACKEND_PID) と Frontend(PID=$FRONTEND_PID) が起動しました。"
echo "🌐 Backend:  http://$BACKEND_HOST:$BACKEND_PORT"
echo "🌐 Frontend: http://localhost:$FRONTEND_PORT"
echo "終了するには Ctrl+C を押してください。"
echo "---------------------------------------------"

# ===== 終了処理 =====
cleanup() {
  echo
  echo "🛑 停止中..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  echo "✅ 停止しました。"
}
trap cleanup INT TERM EXIT

wait