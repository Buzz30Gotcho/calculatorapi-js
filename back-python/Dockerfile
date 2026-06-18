# API calculatrice en Python (http.server natif, sans framework)
FROM python:3.12-slim

WORKDIR /app

# Dépendances (pytest pour pouvoir lancer les tests dans l'image si besoin)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 3002
CMD ["python", "server.py"]
