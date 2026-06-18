"""Serveur HTTP de la calculatrice — même contrat que l'API Node.js.

GET /calculate?operation=add&a=3&b=6  ->  200 {"operation","a","b","result"}
Gère aussi : OPTIONS (204), méthode != GET (405), route inconnue (404),
paramètres manquants / invalides (400) et division par zéro (400).
"""

import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

from calculator import Calculator

PORT = 3002
VALID_OPERATIONS = ["add", "subtract", "multiply", "divide"]


def _normalize(n):
    """Affiche 9 plutôt que 9.0 quand le résultat est entier (comme Node)."""
    if isinstance(n, float) and n.is_integer():
        return int(n)
    return n


class CalculatorHandler(BaseHTTPRequestHandler):
    def _cors_headers(self):
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def _send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def _method_not_allowed(self):
        self.send_response(405)
        self.send_header("Allow", "GET, OPTIONS")
        self._cors_headers()
        self.end_headers()
        self.wfile.write(
            json.dumps({"error": "Méthode non autorisée. Utiliser GET."}).encode("utf-8")
        )

    # Toute méthode autre que GET / OPTIONS -> 405
    do_POST = _method_not_allowed
    do_PUT = _method_not_allowed
    do_DELETE = _method_not_allowed
    do_PATCH = _method_not_allowed

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path != "/calculate":
            self._send_json(404, {"error": "Route introuvable."})
            return

        query = parse_qs(parsed.query, keep_blank_values=True)
        operation = (query.get("operation") or [None])[0]
        a = (query.get("a") or [None])[0]
        b = (query.get("b") or [None])[0]

        if not operation or a in (None, "") or b in (None, ""):
            self._send_json(400, {"error": "Paramètres attendus : operation, a, b"})
            return

        try:
            num_a = float(a)
            num_b = float(b)
        except ValueError:
            self._send_json(400, {"error": "Les paramètres a et b doivent être des nombres."})
            return

        if operation not in VALID_OPERATIONS:
            self._send_json(
                400,
                {"error": "Opération inconnue. Utiliser : add, subtract, multiply, divide"},
            )
            return

        calculator = Calculator()
        try:
            result = getattr(calculator, operation)(num_a, num_b)
            self._send_json(
                200,
                {
                    "operation": operation,
                    "a": _normalize(num_a),
                    "b": _normalize(num_b),
                    "result": _normalize(result),
                },
            )
        except ValueError as error:
            self._send_json(400, {"error": str(error)})

    def log_message(self, *args):  # silence les logs d'accès
        pass


def run(port=PORT):
    server = HTTPServer(("0.0.0.0", port), CalculatorHandler)
    print(f"Serveur Python démarré sur http://localhost:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()
