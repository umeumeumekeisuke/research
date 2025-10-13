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
# 必要な場合：pip install -r requirements.txt
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
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

