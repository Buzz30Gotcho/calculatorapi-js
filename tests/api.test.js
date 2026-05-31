const http = require("http");
const { requestHandler } = require("../src/server");
const { request } = require("./helpers/http");

describe("Tests d'intégration de l'API Calculator", () => {
    let server;
    beforeAll((done) => {
        server = http.createServer(requestHandler);
        server.listen(0, "127.0.0.1", done); // Port aléatoire automatique
    });

    afterAll((done) => {
        server.close(done);
    });

    // 1. BLOC : Performance

    describe("Performance", () => {
        it("Une requête valide répond en moins de 100 ms", async () => {
            const { duration } = await request(server, "/calculate?operation=add&a=1&b=2");
            expect(duration).toBeLessThan(100);
        });

        it("Une requête en erreur 400 répond en moins de 100 ms", async () => {
            const { duration } = await request(server, "/calculate?operation=add&a=abc&b=2");
            expect(duration).toBeLessThan(100);
        });
    });

    // 2. BLOC : Headers de réponse
    describe("Headers de réponse", () => {
        const testHeaders = (headers) => {
            expect(headers['content-type']).toBe("application/json; charset=utf-8");
            expect(headers['access-control-allow-origin']).toBe("*");
        };

        it("Vérifie les headers sur une réponse 200", async () => {
            const { headers } = await request(server, "/calculate?operation=add&a=1&b=2");
            testHeaders(headers);
        });

        it("Vérifie les headers sur une réponse 400", async () => {
            const { headers } = await request(server, "/calculate?operation=add&a=abc&b=2");
            testHeaders(headers);
        });

        it("Vérifie les headers sur une réponse 404", async () => {
            const { headers } = await request(server, "/unknown");
            testHeaders(headers);
        });
    });

    // 3. BLOC : OPTIONS /calculate — preflight CORS
    describe("OPTIONS /calculate — preflight CORS", () => {
        it("Vérifie le contrat OPTIONS", async () => {
            const { status, body, headers } = await request(server, "/calculate", "OPTIONS");
            expect(status).toBe(204);
            expect(body).toBeNull();
            expect(headers['access-control-allow-origin']).toBe("*");
            expect(headers['access-control-allow-methods']).toContain("GET");
        });
    });

    // 4. BLOC : GET /calculate — cas nominaux
    describe("GET /calculate — cas nominaux", () => {
        it.each`
            operation   | a     | b     | expected
            ${'add'}      | ${2}   | ${3}   | ${5}
            ${'subtract'} | ${10}  | ${4}   | ${6}
            ${'multiply'} | ${6}   | ${7}   | ${42}
            ${'divide'}   | ${20}  | ${5}   | ${4}
            ${'add'}      | ${-5}  | ${-3}  | ${-8}
            ${'subtract'} | ${-5}  | ${-3}  | ${-2}
            ${'multiply'} | ${-3}  | ${-4}  | ${12}
            ${'divide'}   | ${-10} | ${-2}  | ${5}
        `("devrait calculer $operation avec $a et $b", async ({ operation, a, b, expected }) => {
            const { status, body } = await request(server, `/calculate?operation=${operation}&a=${a}&b=${b}`);
            expect(status).toBe(200);
            expect(body).toMatchObject({ operation, a, b, result: expected });
        });

        it("Division décimale : proche de 3.333", async () => {
            const { status, body } = await request(server, "/calculate?operation=divide&a=10&b=3");
            expect(status).toBe(200);
            expect(body.result).toBeCloseTo(3.333, 3);
        });

        it("Décimaux en query string", async () => {
            const { status, body } = await request(server, "/calculate?operation=add&a=1.5&b=2.5");
            expect(status).toBe(200);
            expect(body.result).toBe(4);
        });

        it("Contrat JSON 200", async () => {
            const { body } = await request(server, "/calculate?operation=multiply&a=3&b=4");
            expect(body).toHaveProperty('operation');
            expect(body).toHaveProperty('a');
            expect(body).toHaveProperty('b');
            expect(body).toHaveProperty('result');
            expect(body).not.toHaveProperty('error');
        });
    });

    // 5. BLOC : Méthode non autorisée
    describe("Méthode non autorisée", () => {
        it("POST sur /calculate retourne 405 et un message d'erreur", async () => {
            const { status, body, headers } = await request(server, "/calculate", "POST");
            expect(status).toBe(405);
            expect(body).toHaveProperty('error');
            expect(headers['allow']).toContain("GET");
        });

        it("PUT sur /calculate retourne 405", async () => {
            const { status } = await request(server, "/calculate", "PUT");
            expect(status).toBe(405);
        });
    });

    // 6. BLOC : GET /calculate — erreurs 400
    describe("GET /calculate — erreurs 400", () => {
        const checkError400 = async (url, regex) => {
            const { status, body } = await request(server, url);
            expect(status).toBe(400);
            expect(body.error).toMatch(regex);
        };

        it("b manquant", async () => {
            await checkError400("/calculate?operation=add&a=2", /Paramètres attendus/);
        });

        it("a manquant", async () => {
            await checkError400("/calculate?operation=add&b=2", /Paramètres attendus/);
        });

        it("a non numérique", async () => {
            await checkError400("/calculate?operation=add&a=abc&b=3", /doivent être des nombres/);
        });

        it("b non numérique", async () => {
            await checkError400("/calculate?operation=add&a=3&b=abc", /doivent être des nombres/);
        });

        it("Division par zéro", async () => {
            const { status, body } = await request(server, "/calculate?operation=divide&a=10&b=0");
            expect(status).toBe(400);
            expect(body.error).toBe("Division par zéro impossible.");
        });

        it("Opération inconnue", async () => {
            await checkError400("/calculate?operation=modulo&a=10&b=3", /Opération inconnue/);
        });

        it("operation absent", async () => {
            await checkError400("/calculate?a=5&b=3", /Paramètres attendus/);
        });

        it("Contrat JSON erreur", async () => {
            const { body } = await request(server, "/calculate?operation=add&a=2");
            expect(body).toHaveProperty('error');
            expect(body).not.toHaveProperty('result');
        });
    });

    // 7. BLOC : GET — autres routes
    describe("GET — autres routes", () => {
        it("Route inconnue /unknown", async () => {
            const { status, body } = await request(server, "/unknown");
            expect(status).toBe(404);
            expect(body.error).toBe("Route introuvable.");
        });

        it("Racine /", async () => {
            const { status, body } = await request(server, "/");
            expect(status).toBe(404);
            expect(body).toHaveProperty('error');
        });

        it("Slash final /calculate/", async () => {
            const { status, body } = await request(server, "/calculate/");
            expect(status).toBe(404);
            expect(body).toHaveProperty('error');
        });
    });

    // 8. BLOC : Cas limites — edge cases
    describe("Cas limites — edge cases", () => {
        it("Très grande valeur (Infinity)", async () => {
            const { status, body } = await request(server, "/calculate?operation=add&a=1e308&b=1e308");
            expect(status).toBe(200);
            // On accepte null (si JSONifié), "Infinity" ou la valeur globale Infinity
            expect([null, "Infinity", Infinity]).toContain(body.result);
        });

        it("a = -0", async () => {
            const { status, body } = await request(server, "/calculate?operation=add&a=-0&b=5");
            expect(status).toBe(200);
            expect(body.result).toBe(5);
            expect(body.a).toBe(0); // JSON.stringify(-0) donne "0"
        });
    });
});