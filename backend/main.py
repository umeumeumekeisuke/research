from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import logging, os, re, json, requests, glob
from typing import List, Dict, Any
from fastapi.middleware.cors import CORSMiddleware

# ===== 基本設定 =====
logging.basicConfig(level=logging.INFO)
app = FastAPI()
JST = ZoneInfo("Asia/Tokyo")

# Ollama は “必要なときだけ”。環境変数 USE_OLLAMA=1 で有効化（既定: 無効）
USE_OLLAMA  = os.getenv("USE_OLLAMA", "0") == "1"
OLLAMA_URL   = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")

# ===== モデル定義 =====
class ChatRequest(BaseModel):
    content: str
    category: str
    type: str = "text"

class ChatResponse(BaseModel):
    content: str
    sender: str = "bot"
    timestamp: str
    category: str

# ===== ユーティリティ =====
def now_date_str() -> str:
    return datetime.now(JST).date().isoformat()

def parse_date(text: str) -> str:
    dt = datetime.now(JST)
    if "明後日" in text: dt += timedelta(days=2)
    elif "明日" in text: dt += timedelta(days=1)
    elif re.search(r"(今日|本日|きょう)", text): pass
    else:
        m = re.search(r"(\d{4})[-/\.](\d{1,2})[-/\.](\d{1,2})", text)
        if m:
            y, mo, d = map(int, m.groups())
            return datetime(y, mo, d, tzinfo=JST).date().isoformat()
    return dt.date().isoformat()

def stringify(val: Any) -> str:
    try:
        if isinstance(val, (dict, list)):
            return json.dumps(val, ensure_ascii=False)
        return str(val)
    except Exception:
        return str(val)

# ===== データ読み込み（data/*.json 全部）=====
def load_all_jsons(data_dir: str = "./data") -> Dict[str, Any]:
    store: Dict[str, Any] = {}
    for path in glob.glob(os.path.join(data_dir, "*.json")):
        name = os.path.splitext(os.path.basename(path))[0]
        try:
            with open(path, "r", encoding="utf-8") as f:
                store[name] = json.load(f)
        except Exception as e:
            logging.warning(f"Failed to load {path}: {e}")
    return store

DATA = load_all_jsons()
CAL = DATA.get("academic_calendar", {"events": []})
TEACHERS: List[dict] = DATA.get("ryukyu_office_hours", []) or []
CLUBS: List[dict]   = DATA.get("clubs", []) or []

# ===== Ollamaユーティリティ =====
def call_ollama(messages, timeout=6) -> str:
    if not USE_OLLAMA:
        return ""  # 完全無効なら即フォールバック
    try:
        r = requests.post(
            f"{OLLAMA_URL}/api/chat",
            json={"model": OLLAMA_MODEL, "messages": messages, "stream": False},
            timeout=timeout,
        )
        r.raise_for_status()
        return r.json().get("message", {}).get("content", "")
    except Exception as e:
        logging.info(f"Ollama unavailable or error: {e}")
        return ""

def classify_tool(user_text: str) -> str:
    """
    ツール: calendar | teacher | clubs | weather | data_qa | other
    Ollamaが有効ならJSON分類、なければ正規表現フォールバック。
    """
    if USE_OLLAMA:
        sys = (
            "あなたはユーザー質問を分類します。必ずJSONのみを返してください。"
            '{"tool":"calendar"|"teacher"|"clubs"|"weather"|"data_qa"|"other"}'
        )
        resp = call_ollama(
            [{"role": "system", "content": sys}, {"role": "user", "content": user_text}],
            timeout=6,
        )
        if resp:
            try:
                parsed = json.loads(resp)
                if parsed.get("tool") in {"calendar","teacher","clubs","weather","data_qa","other"}:
                    return parsed["tool"]
            except Exception:
                pass
    # ---- 正規表現フォールバック ----
    if re.search(r"(授業|休業|試験|成績|学期|Q[1-4１-４]|カレンダー|学年暦)", user_text):
        return "calendar"
    if re.search(r"(先生|教授|オフィスアワー|研究室)", user_text):
        return "teacher"
    if re.search(r"(サークル|部活|クラブ|同好会|団体|部員|アメフト|フットボール|ウィンドサーフィン|アルティメット)", user_text):
        return "clubs"
    if "天気" in user_text:
        return "weather"
    if re.search(r"(時間|場所|連絡|連絡先|SNS|リンク|活動|いつ|どこ|だれ|方法|申請|締切|費用)", user_text):
        return "data_qa"
    return "other"

# ===== calendar =====
def find_calendar(text: str) -> str:
    target = parse_date(text)
    events = CAL.get("events", [])
    hits = [e for e in events if e["date"] <= target <= e.get("end", e["date"])]
    if not hits:
        return f"📅 {target} に該当イベントはありません。"
    lines = [f"📅 {target} の主要イベント:"]
    for e in hits:
        rng = f" ～{e['end']}" if e.get("end") else ""
        lines.append(f"- {e['title']}{rng}")
    return "\n".join(lines)

# ===== teacher（名前抽出を強化）=====
NAME_JA_RE = re.compile(r"[一-龥々〆ヵヶぁ-んァ-ヴーA-Za-z・\s]+")
CUT_TAIL_RE = re.compile(r"(の.*|に?ついて.*|って.*|とは.*|は\??|を\??|に\??|で\??|、.*|。.*)$")

def extract_name_from_text(text: str) -> str:
    # 1) 敬称を除去
    t = re.sub(r"(先生|教授|さん|氏|様)", "", text)
    # 2) 「〜の」「〜について」等の後ろをカット
    t = CUT_TAIL_RE.sub("", t)
    # 3) 先頭の“らしい名前”トークン
    m = NAME_JA_RE.search(t)
    cand = m.group(0).strip() if m else ""
    # 4) 候補が空/曖昧なら、手持ち名簿から“本文に登場する名前”を拾う
    if not cand or len(cand) <= 1:
        for te in TEACHERS:
            nm = te.get("名前")
            if nm and nm in text:
                return nm
    return cand

def find_teacher(text: str) -> str:
    target = extract_name_from_text(text)
    if not target:
        return "先生のお名前を含めて聞いてください（例：山田先生のオフィスアワーは？）。"
    # まずは「本文にそのまま登場する名前」を優先
    matches = [t for t in TEACHERS if t.get("名前") and t["名前"] in text]
    if not matches:
        # 次に部分一致（抽出名を含む）
        matches = [t for t in TEACHERS if target in t.get("名前", "")]
    if not matches:
        return f"「{target}」に一致する先生の情報は見つかりませんでした。"
    if len(matches) == 1:
        t = matches[0]
        memo = t.get("memo", "（情報なし）")
        link = t.get("リンク")
        extra = f"\nリンク: {link}" if link else ""
        return f"{t.get('所属','')}の{t.get('名前','')}先生のオフィスアワー：{memo}{extra}"
    out = "複数の先生が見つかりました：\n"
    for t in matches[:20]:
        memo = t.get("memo","（情報なし）")
        link = f" / {t['リンク']}" if t.get("リンク") else ""
        out += f"- {t.get('所属','')} {t.get('名前','')}：{memo}{link}\n"
    if len(matches) > 20:
        out += f"...ほか {len(matches)-20} 件\n"
    return out.strip()

# ===== clubs（名前のノイズ除去でゆるめに照合）=====
def norm_club_string(s: str) -> str:
    s = s or ""
    s = re.sub(r"\s+", "", s)
    # よくある装飾語を落として比較
    s = re.sub(r"(琉球大学|琉大|大学|全学)", "", s)
    s = re.sub(r"(部|クラブ|サークル|チーム)", "", s)
    s = re.sub(r"[・\-＿‐ｰ—―]", "", s)
    return s

def find_club(text: str) -> str:
    """
    clubs.json: [ {name, day, location, detail, sns}, ... ]
    - 名前は norm_club_string で正規化し、質問側も同様にして突き合わせ
    - 名前ヒットがなければ detail/location/day にもスコア
    """
    if not isinstance(CLUBS, list):
        return "サークル情報（clubs.json）は配列（list）形式にしてください。"

    q_raw = text
    qn = norm_club_string(q_raw)

    def score_item(it: dict) -> int:
        s = 0
        name = it.get("name") or ""
        detail = it.get("detail") or ""
        location = it.get("location") or ""
        day = it.get("day") or ""
        nn = norm_club_string(name)
        # 名前の相互包含で強スコア
        if nn and (nn in qn or qn in nn):
            s += 8
        # 文字列トークンでの弱スコア
        tokens = [t for t in re.split(r"[^\w一-龥ぁ-んァ-ンー]+", q_raw) if t]
        blob = f"{name} {detail} {location} {day}"
        s += sum(1 for t in tokens if t and t in blob)
        return s

    scored = [(score_item(it), it) for it in CLUBS]
    scored = [x for x in scored if x[0] > 0]

    if not scored:
        # 何も引っかからない場合は一覧
        head = "サークルの例（抜粋）:\n"
        lines = [f"- {it.get('name','(名称不明)')}" for it in CLUBS[:10]]
        return head + "\n".join(lines) if lines else "サークル情報が空のようです。"

    scored.sort(key=lambda x: x[0], reverse=True)
    best = scored[0][1]
    name = best.get("name","(名称不明)")
    day = best.get("day","未記載")
    loc = best.get("location","未記載")
    detail = best.get("detail","")
    sns = best.get("sns")
    out = [f"🏷 {name}", f"- 活動日: {day}", f"- 場所: {loc}"]
    if detail: out.append(f"- 概要: {detail}")
    if sns: out.append(f"- SNS: {sns}")
    if len(scored) > 1:
        alts = [it.get("name") for _, it in scored[1:4] if it.get("name")]
        if alts:
            out.append("ほかの該当候補: " + " / ".join(alts))
    return "\n".join(out)

# ===== weather（Open-Meteo）=====
def get_weather(text: str) -> str:
    try:
        loc = "那覇"
        m = re.search(r"(札幌|仙台|東京|横浜|名古屋|京都|大阪|神戸|広島|福岡|那覇|沖縄)", text)
        if m: loc = m.group(1)
        g = requests.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": loc, "count": 1, "language": "ja"},
            timeout=6,
        ).json()
        if not g.get("results"):
            return f"{loc} の天気情報が見つかりませんでした。"
        lat, lon = g["results"][0]["latitude"], g["results"][0]["longitude"]
        f = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={"latitude": lat, "longitude": lon, "current": "temperature_2m,weathercode"},
            timeout=6,
        ).json()
        cur = f.get("current", {})
        t = cur.get("temperature_2m")
        if t is None:
            return f"{loc} の現在気温を取得できませんでした。"
        return f"{loc} の現在の気温は {t}℃ です。"
    except Exception as e:
        return f"天気情報の取得に失敗しました：{e}"

# ===== data_qa（全JSONの横断キーワード検索）=====
def search_data_any(user_text: str, topk: int = 5) -> str:
    terms = [t for t in re.split(r"[^\w一-龥ぁ-んァ-ンー]+", user_text) if t]
    if not terms:
        return "検索キーワードが読み取れませんでした。もう少し詳しく書いてください。"
    hits = []
    for fname, content in DATA.items():
        try:
            if isinstance(content, list):
                for idx, item in enumerate(content):
                    blob = stringify(item)
                    score = sum(1 for t in terms if t and t in blob)
                    if score:
                        hits.append((score, fname, f"[{idx}]", item))
            elif isinstance(content, dict):
                blob = stringify(content)
                score = sum(1 for t in terms if t and t in blob)
                if score:
                    hits.append((score, fname, "", content))
            else:
                blob = stringify(content)
                score = sum(1 for t in terms if t and t in blob)
                if score:
                    hits.append((score, fname, "", content))
        except Exception:
            continue
    if not hits:
        return "手元の data/ から該当が見つかりませんでした。ファイルやキー名・表記ゆれをご確認ください。"
    hits.sort(key=lambda x: x[0], reverse=True)
    out_lines = ["🔎 data/ 横断ヒット（上位）:"]
    for sc, fn, key, val in hits[:topk]:
        preview = stringify(val)
        if len(preview) > 400:
            preview = preview[:400] + "…"
        out_lines.append(f"- {fn}{key}（score={sc}）: {preview}")
    return "\n".join(out_lines)

# ===== ルーティング =====
@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    text = req.content.strip()
    tool = classify_tool(text)
    if tool == "calendar":
        reply = find_calendar(text)
    elif tool == "teacher":
        reply = find_teacher(text)
    elif tool == "clubs":
        reply = find_club(text)
    elif tool == "weather":
        reply = get_weather(text)
    elif tool == "data_qa":
        reply = search_data_any(text)
    else:
        out = call_ollama(
            [{"role": "system", "content": "あなたは大学の自動応答アシスタントです。"},
             {"role": "user", "content": text}],
            timeout=6,
        )
        reply = out or search_data_any(text)
    return ChatResponse(content=reply, timestamp=datetime.now(JST).isoformat(), category=req.category)

@app.get("/healthz")
def health():
    return {"status": "ok"}

# ===== CORS =====
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
