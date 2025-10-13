import requests

url = "http://localhost:11434/api/generate"
payload = {
    "model": "mistral",
    "prompt": "琉球大学の夏休みはいつですか？",
    "stream": False
}

response = requests.post(url, json=payload, timeout=60)
print(response.json())
