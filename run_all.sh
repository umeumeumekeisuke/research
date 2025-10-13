#!/bin/bash
# =========================================
# プロジェクト起動スクリプト
# backend(FastAPI) と frontend(React) を同時起動
# =========================================

# エラー発生時に終了
set -e

# バックエンド実行ディレクトリへ
cd "$(dirname "$0")"

echo "🔧 Backend と Frontend を同時に起動します..."
echo "---------------------------------------------"

# Python 仮想環境の有効化（必要なら）
# source ~/.venv/bin/activate

# backend 起動
echo "🚀 Backend を起動中..."
cd backend
#!/usr/bin/env bash
set -euo pipefail

# ==== 設定 ====
PORT=8000
OLLAMA_MODEL=${OLLAMA_MODEL:-mistral}
USE_OLLAMA=1

echo "==> Ollamaサーバの確認..."
if ! curl -s http://localhost:11434/api/version >/dev/null; then
  echo "⚠️ Ollamaが動いていません。起動します..."
  if command -v brew >/dev/null 2>&1; then
    brew services start ollama
    sleep 3
  else
    echo "brewが見つかりません。手動で 'ollama serve' を起動してください。"
  fi
else
  echo "✅ Ollamaサーバは稼働中です。"
fi

echo "==> FastAPIサーバを起動..."
export USE_OLLAMA=$USE_OLLAMA
export OLLAMA_MODEL=$OLLAMA_MODEL

# 仮想環境があれば有効化
if [ -d ".venv" ]; then
  source .venv/bin/activate
fi

# Uvicorn起動
uvicorn main:app --reload --port $PORT
cd ..

# frontend 起動
echo "💻 Frontend を起動中..."
cd frontend
npm install
npm run dev &
FRONTEND_PID=$!
cd ..

# 両方のプロセスを監視
echo "---------------------------------------------"
echo "✅ Backend(PID=$BACKEND_PID) と Frontend(PID=$FRONTEND_PID) が起動しました。"
echo "🌐 Backend: http://localhost:8000"
echo "🌐 Frontend: http://localhost:5173"
echo "終了するには Ctrl+C を押してください。"
echo "---------------------------------------------"

# Ctrl+C で両方停止
trap "echo '🛑 停止中...'; kill $BACKEND_PID $FRONTEND_PID" SIGINT

# プロセスを待機
wait

