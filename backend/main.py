from fastapi import FastAPI, Query
from pydantic import BaseModel
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import logging, os, re, json, requests, glob, httpx
from typing import List, Dict, Any
from fastapi.middleware.cors import CORSMiddleware

# ===== 基本設定 =====
logging.basicConfig(level=logging.INFO)
app = FastAPI()
JST = ZoneInfo("Asia/Tokyo")

# ===== ChatGPT (OpenAI API) 設定 =====
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL   = os.getenv("OPENAI_MODEL", "gpt-5-nano")

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

# ===== データ読み込み（./data/*.json）=====
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

# ---- 教員: faculty形式 or 日本語配列の両対応（名前/所属/memo に正規化）----
_raw_teachers = DATA.get("ryukyu_office_hours", [])
TEACHERS: List[dict] = []
if isinstance(_raw_teachers, list):
    TEACHERS = _raw_teachers
elif isinstance(_raw_teachers, dict) and isinstance(_raw_teachers.get("faculty"), list):
    for fac in _raw_teachers["faculty"]:
        name = fac.get("name_ja") or fac.get("name") or fac.get("name_en") or ""
        dept = fac.get("department") or ""
        ohs = fac.get("office_hours", [])
        if isinstance(ohs, list) and ohs:
            memo = " / ".join(
                f"{o.get('weekday','')} {o.get('start','')}-{o.get('end','')}"
                for o in ohs
            )
        else:
            memo = fac.get("memo", "（情報なし）")
        TEACHERS.append({"名前": name, "所属": dept, "memo": memo})

CLUBS: List[dict] = DATA.get("clubs", []) or []

# ===== ChatGPTユーティリティ =====
def call_openai(messages: List[Dict[str, str]], timeout: int = 12) -> str:
    """OpenAI Responses APIを叩いてテキストを返す"""
    if not OPENAI_API_KEY:
        return ""
    try:
        headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
        payload = {"model": OPENAI_MODEL, "input": messages, "store": False}
        with httpx.Client(timeout=timeout) as client:
            r = client.post("https://api.openai.com/v1/responses", headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
            for item in data.get("output", []):
                if item.get("type") == "message":
                    cont = item.get("content") or []
                    if cont and isinstance(cont, list):
                        first = cont[0]
                        if first.get("type") == "output_text":
                            return (first.get("text") or "").strip()
                if item.get("type") == "output_text":
                    return (item.get("text") or "").strip()
            return (data.get("text") or "").strip()
    except Exception as e:
        logging.warning(f"OpenAI error: {e}")
        return ""

# ===== ツール分類 =====
def classify_tool(user_text: str) -> str:
    # まずはOpenAIで分類（あれば）
    if OPENAI_API_KEY:
        sys = (
            "あなたは大学に関する質問を分類します。"
            "必ずJSONのみを返してください。"
            ' 出力例: {"tool":"teacher"}'
            ' 候補: ["calendar","teacher","clubs","weather","data_qa","other"]'
        )
        out = call_openai(
            [{"role": "system", "content": sys},
             {"role": "user", "content": user_text}],
            timeout=8,
        )
        if out:
            try:
                tool = json.loads(out).get("tool")
                if tool in {"calendar","teacher","clubs","weather","data_qa","other"}:
                    return tool
            except Exception:
                pass

    # ---- 正規表現フォールバック（休暇＆授業ワードを強化）----
    if re.search(r"(夏休み|冬休み|春休み|休業|休暇|祝日|連休|学事暦|スケジュール)", user_text):
        return "calendar"
    if re.search(r"(授業開始|授業再開|授業終了|開講|閉講|授業|休講|試験|成績|学期|カレンダー|学年暦|Q[1-4１-４])", user_text):
        return "calendar"
    if re.search(r"(先生|教授|オフィスアワー|研究室)", user_text):
        return "teacher"
    if re.search(r"(サークル|部活|クラブ|同好会|団体|部員)", user_text):
        return "clubs"
    if "天気" in user_text:
        return "weather"
    return "data_qa"

# ===== カレンダー検索（キーワード優先 → 日付ヒット）=====
def find_calendar(text: str) -> str:
    events = CAL.get("events", [])
    if not isinstance(events, list):
        return "学年暦データの形式が不正です。"

    # 正規化（全角数字→半角）
    z2h = str.maketrans("０１２３４５６７８９", "0123456789")
    norm_text = text.translate(z2h)

    def fmt_line(title: str, s: str, ed: str) -> str:
        if s and ed and ed != s:
            return f"- {title}: {s} ～ {ed}"
        elif s:
            return f"- {title}: {s}"
        return f"- {title}"

    # 1) 休暇系キーワード
    kw_map = {
        "夏": ["夏季休業", "夏休み"],
        "冬": ["冬季休業", "冬休み"],
        "春": ["春季休業", "春休み"],
    }
    season = None
    if re.search(r"夏", norm_text): season = "夏"
    elif re.search(r"冬", norm_text): season = "冬"
    elif re.search(r"春", norm_text): season = "春"

    if season or re.search(r"(休業|休暇|休み)", norm_text):
        keys = kw_map.get(season, None)
        hits = []
        for e in events:
            title = e.get("title", "")
            if (keys and any(k in title for k in keys)) or (not keys and re.search(r"(休業|休暇|休み)", title)):
                s = e.get("date") or e.get("date_start")
                ed = e.get("end")  or e.get("date_end") or s
                hits.append((title, s, ed))
        if hits:
            head = f"📅 {season+'休み' if season else '休暇関連'}イベント:"
            return "\n".join([head] + [fmt_line(t, s, ed) for (t, s, ed) in hits])

    # 2) 授業開始/終了・開講/閉講 のキーワード検索
    kw_start = re.search(r"(授業開始|授業再開|開講)", norm_text)
    kw_end   = re.search(r"(授業終了|閉講)", norm_text)

    # 学期やクォーターの条件抽出
    want_front = bool(re.search(r"(前学期|前期)", norm_text))
    want_back  = bool(re.search(r"(後学期|後期)", norm_text))
    m_q = re.search(r"第\s*([1-4])\s*クォーター", norm_text)
    want_q = m_q.group(1) if m_q else None  # "1".."4"

    def match_term_filters(title: str) -> bool:
        # 前学期⇔第1/2Q、後学期⇔第3/4Q のゆるい対応
        if want_q and (f"第{want_q}クォーター" not in title):
            return False
        if want_front and not (("前学期" in title) or ("第1クォーター" in title) or ("第2クォーター" in title)):
            return False
        if want_back and not (("後学期" in title) or ("第3クォーター" in title) or ("第4クォーター" in title)):
            return False
        return True

    if kw_start or kw_end:
        hits = []
        for e in events:
            title = e.get("title", "")
            if kw_start and re.search(r"(授業開始|授業再開|開講)", title):
                if match_term_filters(title):
                    s = e.get("date") or e.get("date_start")
                    ed = e.get("end")  or e.get("date_end") or s
                    hits.append((title, s, ed))
            elif kw_end and re.search(r"(授業終了|閉講)", title):
                if match_term_filters(title):
                    s = e.get("date") or e.get("date_start")
                    ed = e.get("end")  or e.get("date_end") or s
                    hits.append((title, s, ed))
        if hits:
            head = "📅 授業スケジュール:"
            return "\n".join([head] + [fmt_line(t, s, ed) for (t, s, ed) in hits])

    # 3) 日付でのヒット（「今日/明日/YYYY-MM-DD」など）
    target = parse_date(norm_text)
    day_hits = []
    for e in events:
        s = e.get("date") or e.get("date_start")
        ed = e.get("end")  or e.get("date_end") or s
        if s and ed and s <= target <= ed:
            day_hits.append(e.get("title", "(無題)"))
    if not day_hits:
        return f"📅 {target} に該当イベントはありません。"
    return "📅 " + target + " の主なイベント:\n" + "\n".join(f"- {h}" for h in day_hits)

# ===== 教員検索 =====
NAME_JA_RE = re.compile(r"[一-龥々〆ヵヶぁ-んァ-ヴーA-Za-z・\s]+")
CUT_TAIL_RE = re.compile(r"(の.*|に?ついて.*|って.*|とは.*|は\??|を\??|に\??|で\??|、.*|。.*)$")

def find_teacher(text: str) -> str:
    if not TEACHERS:
        return "教員データが読み込まれていません。/admin/debug-data を確認してください。"

    # 敬称除去 → 文末ノイズ除去 → 氏名断片抽出
    t = re.sub(r"(先生|教授|さん|氏|様)", "", text)
    t = CUT_TAIL_RE.sub("", t)
    m = NAME_JA_RE.search(t)
    key = (m.group(0).strip() if m else "")[:20]

    if not key:
        return "先生のお名前を含めて聞いてください（例：井上先生のオフィスアワーは？）。"

    # 完全一致優先 → 部分一致
    matches = [x for x in TEACHERS if x.get("名前") and x["名前"] in text]
    if not matches:
        matches = [x for x in TEACHERS if key in (x.get("名前") or "")]

    if not matches:
        # 候補トップ5（頭文字ざっくり）
        cands = [x.get("名前") for x in TEACHERS if key and key[0] in (x.get("名前") or "")]
        cands = [c for c in cands if c]
        seen, top = set(), []
        for c in cands:
            if c not in seen:
                seen.add(c); top.append(c)
            if len(top) >= 5: break
        if top:
            return f"「{key}」に一致する先生は見つかりませんでした。\n候補: " + " / ".join(top)
        return f"「{key}」に一致する先生の情報は見つかりませんでした。"

    if len(matches) == 1:
        t = matches[0]
        return f"{t.get('所属','')}の{t.get('名前','')}先生のオフィスアワー：{t.get('memo','情報なし')}"

    lines = ["複数の先生が見つかりました："]
    for t in matches[:20]:
        lines.append(f"- {t.get('所属','')} {t.get('名前','')}：{t.get('memo','情報なし')}")
    if len(matches) > 20:
        lines.append(f"...ほか {len(matches)-20} 件")
    return "\n".join(lines)

# ===== サークル検索 =====
def find_club(text: str) -> str:
    for c in CLUBS:
        if c.get("name") and c["name"] in text:
            return f"🏷 {c['name']} — 活動日: {c.get('day','未記載')} / 場所: {c.get('location','未記載')}"
    return "該当するサークル情報が見つかりませんでした。"

# ===== 天気 =====
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

# ===== ローカル全文検索 =====
def search_data_any(user_text: str, topk=5) -> str:
    terms = [t for t in re.split(r"[^\w一-龥ぁ-んァ-ンー]+", user_text) if t]
    hits = []
    for fname, content in DATA.items():
        if isinstance(content, list):
            for idx, item in enumerate(content):
                blob = stringify(item)
                score = sum(1 for t in terms if t in blob)
                if score:
                    hits.append((score, fname, idx, item))
        elif isinstance(content, dict):
            blob = stringify(content)
            score = sum(1 for t in terms if t in blob)
            if score:
                hits.append((score, fname, "", content))
    hits.sort(key=lambda x: x[0], reverse=True)
    if not hits:
        return "該当する情報は見つかりませんでした。"
    out = ["🔍 検索結果:"]
    for sc, fn, idx, item in hits[:topk]:
        out.append(f"- {fn}[{idx}] ({sc}): {stringify(item)[:300]}")
    return "\n".join(out)

# ===== APIルーティング =====
@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    text = req.content.strip()
    # フロント指定カテゴリを優先
    valid = {"calendar","teacher","clubs","weather","data_qa","other"}
    tool = req.category if req.category in valid else classify_tool(text)

    if tool == "calendar":
        reply = find_calendar(text)
    elif tool == "teacher":
        reply = find_teacher(text)
    elif tool == "clubs":
        reply = find_club(text)
    elif tool == "weather":
        reply = get_weather(text)
    else:
        out = call_openai(
            [{"role": "system", "content": "あなたは大学の自動応答アシスタントです。"},
             {"role": "user", "content": text}]
        )
        reply = out or search_data_any(text)
    return ChatResponse(content=reply, timestamp=datetime.now(JST).isoformat(), category=req.category)

# ===== 管理系エンドポイント =====
@app.get("/admin/debug-data")
def debug_data():
    return {
        "cwd": os.getcwd(),
        "loaded_keys": list(DATA.keys()),
        "teachers_count": len(TEACHERS),
        "clubs_count": len(CLUBS),
        "calendar_events": len(CAL.get("events", []))
    }

@app.get("/admin/teachers")
def admin_teachers(like: str = Query("", description="部分一致する氏名を検索")):
    if not TEACHERS:
        return {"count": 0, "samples": []}
    if not like:
        # 先頭20件のサンプル名を返す
        return {"count": len(TEACHERS), "samples": [t.get("名前") for t in TEACHERS[:20]]}
    hits = [t for t in TEACHERS if like in (t.get("名前") or "")]
    return {
        "like": like,
        "count": len(hits),
        "names": [t.get("名前") for t in hits[:50]],
    }

@app.get("/healthz")
def health():
    return {"status": "ok"}

# ===== CORS =====
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)