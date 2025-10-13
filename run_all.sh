#!/usr/bin/env bash
# =========================================
# プロジェクト起動スクリプト
# backend(FastAPI) と frontend(React) を同時起動
# =========================================
set -Eeuo pipefail

# スクリプトの場所に移動
cd "$(dirname "$0")"

# ===== 設定 =====
BACKEND_PORT="${BACKEND_PORT:-8000}"
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

# Ollamaを使うなら 1（未設定なら0）
export USE_OLLAMA="${USE_OLLAMA:-0}"
export OLLAMA_MODEL="${OLLAMA_MODEL:-mistral}"

echo "🔧 Backend と Frontend を同時に起動します..."
echo "---------------------------------------------"

# ===== Ollama（任意）=====
if [[ "$USE_OLLAMA" == "1" ]]; then
  echo "🤖 Ollama 使用モード（モデル: $OLLAMA_MODEL）"
  if ! curl -fsS http://localhost:11434/api/version >/dev/null 2>&1; then
    echo "⚠️  Ollamaが動いていません。'ollama serve' で別ターミナルから起動してください（macなら 'brew services start ollama' も可）。"
  else
    echo "✅ Ollama サーバは稼働中です。"
  fi
else
  echo "ℹ️  USE_OLLAMA=0（Ollamaは使いません）"
fi

# ===== Backend 起動 =====
echo "🚀 Backend を起動中..."
pushd backend >/dev/null

# 仮想環境があれば有効化
if [[ -d ".venv" ]]; then
  # shellcheck disable=SC1091
  source ~/.venv/bin/activate
fi

# ※ uvicorn をバックグラウンドで起動して PID を保持
uvicorn main:app --reload --host "$BACKEND_HOST" --port "$BACKEND_PORT" &
BACKEND_PID=$!
popd >/dev/null

# ===== Frontend 起動 =====
echo "💻 Frontend を起動中..."
pushd frontend >/dev/null

# lockがあるなら npm ci、なければ npm install
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

# Viteを指定ポートで起動（埋まってたら失敗させる）
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

# ===== 終了処理（Ctrl+C/終了時に両方止める）=====
cleanup() {
  echo
  echo "🛑 停止中..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  echo "✅ 停止しました。"
}
trap cleanup INT TERM EXIT

# 子プロセスを待機
wait