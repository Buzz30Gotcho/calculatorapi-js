package com.calculator;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Serveur HTTP de la calculatrice — même contrat que l'API Node.js.
 * Utilise le serveur HTTP intégré au JDK (com.sun.net.httpserver), sans framework.
 */
public class Server {

    static final int PORT = 3001;
    static final List<String> VALID_OPERATIONS =
            Arrays.asList("add", "subtract", "multiply", "divide");

    public static void main(String[] args) throws IOException {
        HttpServer server = createServer(PORT);
        server.start();
        System.out.println("Serveur Java démarré sur http://localhost:" + PORT);
    }

    /** Crée (sans démarrer) le serveur — pratique pour les tests. */
    public static HttpServer createServer(int port) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/", new CalculatorHandler());
        return server;
    }

    static class CalculatorHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
            exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, OPTIONS");
            exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization");

            String method = exchange.getRequestMethod();

            if ("OPTIONS".equals(method)) {
                exchange.sendResponseHeaders(204, -1);
                exchange.close();
                return;
            }

            if (!"GET".equals(method)) {
                exchange.getResponseHeaders().set("Allow", "GET, OPTIONS");
                send(exchange, 405, "{\"error\":\"Méthode non autorisée. Utiliser GET.\"}");
                return;
            }

            URI uri = exchange.getRequestURI();
            if (!"/calculate".equals(uri.getPath())) {
                send(exchange, 404, "{\"error\":\"Route introuvable.\"}");
                return;
            }

            Map<String, String> query = parseQuery(uri.getRawQuery());
            String operation = query.get("operation");
            String a = query.get("a");
            String b = query.get("b");

            if (operation == null || a == null || b == null
                    || operation.isEmpty() || a.isEmpty() || b.isEmpty()) {
                send(exchange, 400, "{\"error\":\"Paramètres attendus : operation, a, b\"}");
                return;
            }

            double numA;
            double numB;
            try {
                numA = Double.parseDouble(a);
                numB = Double.parseDouble(b);
            } catch (NumberFormatException e) {
                send(exchange, 400, "{\"error\":\"Les paramètres a et b doivent être des nombres.\"}");
                return;
            }

            if (!VALID_OPERATIONS.contains(operation)) {
                send(exchange, 400,
                        "{\"error\":\"Opération inconnue. Utiliser : add, subtract, multiply, divide\"}");
                return;
            }

            Calculator calculator = new Calculator();
            try {
                double result = switch (operation) {
                    case "add" -> calculator.add(numA, numB);
                    case "subtract" -> calculator.subtract(numA, numB);
                    case "multiply" -> calculator.multiply(numA, numB);
                    default -> calculator.divide(numA, numB);
                };
                String json = String.format(
                        "{\"operation\":\"%s\",\"a\":%s,\"b\":%s,\"result\":%s}",
                        operation, num(numA), num(numB), num(result));
                send(exchange, 200, json);
            } catch (ArithmeticException e) {
                send(exchange, 400, "{\"error\":\"" + e.getMessage() + "\"}");
            }
        }
    }

    /** Affiche 9 plutôt que 9.0 quand le nombre est entier (comme Node). */
    static String num(double d) {
        if (d == Math.floor(d) && !Double.isInfinite(d)) {
            return Long.toString((long) d);
        }
        return Double.toString(d);
    }

    static Map<String, String> parseQuery(String rawQuery) {
        Map<String, String> map = new HashMap<>();
        if (rawQuery == null || rawQuery.isEmpty()) {
            return map;
        }
        for (String pair : rawQuery.split("&")) {
            int idx = pair.indexOf('=');
            String key = idx >= 0 ? pair.substring(0, idx) : pair;
            String value = idx >= 0 ? pair.substring(idx + 1) : "";
            map.put(decode(key), decode(value));
        }
        return map;
    }

    static String decode(String s) {
        return URLDecoder.decode(s, StandardCharsets.UTF_8);
    }

    static void send(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }
}
