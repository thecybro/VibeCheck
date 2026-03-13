from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

EMOTION_MAP = {
    "anger": "anger",
    "disgust": "toxicity",
    "fear": "fear",
    "sadness": "sadness",
    "joy": None,
    "surprise": None,
    "neutral": None,
}

print("Loading the model...")

classifier = pipeline(
    task="text-classification",
    model="j-hartmann/emotion-english-distilroberta-base",
    top_k=2
)

print("Model loaded successfully!")

@app.get("/health")
def health():
    return {"status": "okay"}

@app.post("/classify")
def classify(content: dict):
    text=content.get("text", "")

    if not text:
        return {"error": "Text not found!"}

    if len(text.strip()) < 30:
        return {"error": "Text is too short!"}

    result = classifier(text)
    final = result[0][0]

    raw_label = final["label"].lower()

    raw_score = final["score"]

    confidence = (round(final["score"] * 100, 4))

    emotion = EMOTION_MAP.get(raw_label, None)

    if raw_score < 0.7:
        emotion = None

    return {
        "emotion": emotion,
        "raw_label": raw_label,
        "confidence": confidence,
        "raw_score": raw_score,
        "blocked": emotion is not None
    }

    