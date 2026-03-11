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

    result = classifier(text)
    final = result[0][0]
    final1 = result[0][1]

    raw_label = final["label"].lower()
    raw_label1 = final1["label"].lower()

    raw_score = final["score"]
    raw_score1 = final1["score"]

    confidence = (round(final["score"] * 100, 4))
    confidence1 = (round(final1["score"] * 100, 4))

    emotion = EMOTION_MAP.get(raw_label, None)
    emotion1 = EMOTION_MAP.get(raw_label1, None)

    if raw_score < 0.7:
        emotion = None
        
    if raw_score1 < 0.7:
        emotion1 = None

    return {
    "emotions": [
        {"emotion": emotion, "raw_label": raw_label, "confidence": confidence, "raw_score": raw_score, "blocked": emotion is not None},
        {"emotion1": emotion1, "raw_label1": raw_label1, "confidence1": confidence1, "raw_score1": raw_score1, "blocked": emotion1 is not None}
    ],
    "blocked": emotion is not None or emotion1 is not None,
    "reason": emotion or emotion1
    }

    