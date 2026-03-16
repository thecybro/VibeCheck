FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the model during build so users don't wait
RUN python -c "from transformers import pipeline; pipeline(task='text-classification', model='SamLowe/roberta-base-go_emotions', top_k=1)"

COPY main.py .

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]