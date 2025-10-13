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
