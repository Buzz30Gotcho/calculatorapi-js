package com.calculator;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sun.net.httpserver.HttpServer;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;

/** Tests d'intégration de l'API HTTP (équivalent api.test.js avec JUnit 5). */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class ServerTest {

    private HttpServer server;
    private int port;
    private final HttpClient client = HttpClient.newHttpClient();

    @BeforeAll
    void startServer() throws Exception {
        server = Server.createServer(0); // port libre choisi par l'OS
        port = server.getAddress().getPort();
        server.start();
    }

    @AfterAll
    void stopServer() {
        server.stop(0);
    }

    private HttpResponse<String> get(String path) throws Exception {
        HttpRequest request =
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).build();
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void additionOk() throws Exception {
        HttpResponse<String> res = get("/calculate?operation=add&a=3&b=6");
        assertEquals(200, res.statusCode());
        assertTrue(res.body().contains("\"result\":9"));
    }

    @Test
    void divisionParZero() throws Exception {
        HttpResponse<String> res = get("/calculate?operation=divide&a=5&b=0");
        assertEquals(400, res.statusCode());
        assertTrue(res.body().contains("Division par zéro impossible."));
    }

    @Test
    void parametresManquants() throws Exception {
        HttpResponse<String> res = get("/calculate?operation=add&a=3");
        assertEquals(400, res.statusCode());
        assertTrue(res.body().contains("Paramètres attendus"));
    }

    @Test
    void parametreNonNumerique() throws Exception {
        HttpResponse<String> res = get("/calculate?operation=add&a=abc&b=3");
        assertEquals(400, res.statusCode());
        assertTrue(res.body().contains("doivent être des nombres"));
    }

    @Test
    void operationInconnue() throws Exception {
        HttpResponse<String> res = get("/calculate?operation=power&a=2&b=3");
        assertEquals(400, res.statusCode());
        assertTrue(res.body().contains("Opération inconnue"));
    }

    @Test
    void routeInconnue() throws Exception {
        HttpResponse<String> res = get("/unknown");
        assertEquals(404, res.statusCode());
        assertTrue(res.body().contains("Route introuvable."));
    }

    @Test
    void methodeNonAutorisee() throws Exception {
        HttpRequest request =
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/calculate?operation=add&a=3&b=6"))
                        .POST(HttpRequest.BodyPublishers.noBody())
                        .build();
        HttpResponse<String> res = client.send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(405, res.statusCode());
        assertTrue(res.body().contains("Méthode non autorisée"));
    }
}
