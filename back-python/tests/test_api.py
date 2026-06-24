
import json
import sys
import threading
import urllib.error
import urllib.request
from http.server import HTTPServer
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from server import CalculatorHandler


@pytest.fixture(scope="module")
def base_url():
    server = HTTPServer(("localhost", 0), CalculatorHandler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f"http://localhost:{port}"
    server.shutdown()


def request(base_url, path, method="GET"):
    req = urllib.request.Request(base_url + path, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            body = response.read().decode("utf-8")
            return response.status, json.loads(body) if body else None
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8")
        return error.code, json.loads(body) if body else None


def test_addition_ok(base_url):
    status, data = request(base_url, "/calculate?operation=add&a=3&b=6")
    assert status == 200
    assert data["result"] == 9


def test_division_par_zero(base_url):
    status, data = request(base_url, "/calculate?operation=divide&a=5&b=0")
    assert status == 400
    assert data["error"] == "Division par zéro impossible."


def test_parametres_manquants(base_url):
    status, data = request(base_url, "/calculate?operation=add&a=3")
    assert status == 400
    assert "Paramètres attendus" in data["error"]


def test_parametre_non_numerique(base_url):
    status, data = request(base_url, "/calculate?operation=add&a=abc&b=3")
    assert status == 400
    assert "doivent être des nombres" in data["error"]


def test_operation_inconnue(base_url):
    status, data = request(base_url, "/calculate?operation=power&a=2&b=3")
    assert status == 400
    assert "Opération inconnue" in data["error"]


def test_route_inconnue(base_url):
    status, data = request(base_url, "/unknown")
    assert status == 404
    assert data["error"] == "Route introuvable."


def test_methode_non_autorisee(base_url):
    status, data = request(base_url, "/calculate?operation=add&a=3&b=6", method="POST")
    assert status == 405
    assert "Méthode non autorisée" in data["error"]
