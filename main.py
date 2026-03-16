from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline

import os
import signal
from threading import Timer

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

EMOTION_MAP = {
    "anger": "anger",
    "annoyance": "anger",

    "sadness": "sadness",
    "grief": "sadness",
    "remorse": "sadness",

    "fear": "fear",

    "disgust": "toxicity",

    "admiration": None,
    "amusement": None,
    "approval": None,
    "caring": None,
    "confusion": None,
    "curiosity": None,
    "desire": None,
    "disappointment": None,
    "disapproval": None,
    "embarrassment": None,
    "excitement": None,
    "gratitude": None,
    "joy": None,
    "love": None,
    "nervousness": None,
    "optimism": None,
    "pride": None,
    "realization": None,
    "relief": None,
    "surprise": None,
    "neutral": None,
}

SENSITIVITY_MAP = {
    "high": 0.45,
    "medium": 0.65,
    "low": 0.75,
}

print("Loading the model...")

classifier = pipeline(
    task="text-classification",
    model="SamLowe/roberta-base-go_emotions",
    top_k=None
)

print("Model loaded successfully!")

@app.get("/health")
def health():
    return {"status": "okay"}

@app.post("/classify")
def classify(content: dict):
    text=content.get("text", "")
    sensitivity=content.get("sensitivity", "medium")

    if not text:
        return {"error": "Text not found!"}

    text = text[:512]

    result = classifier(text)
    final = result[0][0]

    raw_label = final["label"].lower()

    raw_score = round(final["score"], 2)

    confidence = (round(final["score"] * 100))

    emotion = EMOTION_MAP.get(raw_label, None)

    threshold = SENSITIVITY_MAP.get(sensitivity, 0.75)
    if raw_score < threshold:
        emotion = None
        
    return {
        "emotion": emotion,
        "raw_label": raw_label,
        "confidence": confidence,
        "raw_score": raw_score,
        "threshold": threshold,
        "blocked": emotion is not None
    }

    