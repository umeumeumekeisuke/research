from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime
import logging
from fastapi.middleware.cors import CORSMiddleware


logging.basicConfig(level=logging.INFO)

app = FastAPI()

class ChatRequest(BaseModel):
    content: str
    category: str
    type: str = "text"

class ChatResponse(BaseModel):
    content: str
    sender: str = "bot"
    timestamp: str
    category: str

bot_responses = {
    "academic": [
        "勉強の仕方についてアドバイスできます！",
        "効率的な勉強法を一緒に考えましょう。"
    ],
    "default": [
        "こんにちは！ご質問ありがとうございます。",
        "どのようなお悩みですか？"
    ]
}

@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    import random

    # リクエストの内容をログに出力
    logging.info(f"受信メッセージ - カテゴリ: {req.category}, 種類: {req.type}, 内容: {req.content}")
    print(f"[受信] カテゴリ: {req.category}, 種類: {req.type}, 内容: {req.content}")

    
    responses = bot_responses.get(req.category, bot_responses["default"])
    reply = random.choice(responses)

    return ChatResponse(
        content=reply,
        timestamp=datetime.now().isoformat(),
        category=req.category
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # ここに許可するオリジンを追加
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)


