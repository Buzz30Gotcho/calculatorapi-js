// Doit être défini AVANT le require de server (qui charge db + auth)
process.env.DB_PATH = ":memory:";
process.env.SUPABASE_JWT_SECRET = "test-secret";

const http = require("http");
const jwt = require("jsonwebtoken");
const { requestHandler } = require("../src/server");
const { closeDb } = require("../src/db");
const { request } = require("./helpers/http");

const tokenFor = (sub, email = "u@test.com") =>
    jwt.sign({ sub, email }, "test-secret");

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe("Historique des calculs (/calculate + /history, protégé)", () => {
    let server;

    beforeAll((done) => {
        server = http.createServer(requestHandler);
        server.listen(0, "127.0.0.1", done);
    });

    afterAll((done) => {
        closeDb();
        server.close(done);
    });

    it("un calcul authentifié est enregistré (saved: true)", async () => {
        const token = tokenFor("alice");
        const res = await request(server, "/calculate?operation=add&a=3&b=6", "GET", auth(token));
        expect(res.status).toBe(200);
        expect(res.body.result).toBe(9);
        expect(res.body.saved).toBe(true);
    });

    it("un calcul anonyme fonctionne mais n'est pas enregistré (saved: false)", async () => {
        const res = await request(server, "/calculate?operation=add&a=1&b=1");
        expect(res.status).toBe(200);
        expect(res.body.result).toBe(2);
        expect(res.body.saved).toBe(false);
    });

    it("/history sans token renvoie 401", async () => {
        const res = await request(server, "/history");
        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/manquant/);
    });

    it("/history avec un token invalide renvoie 401", async () => {
        const res = await request(server, "/history", "GET", auth("pas-un-vrai-token"));
        expect(res.status).toBe(401);
    });

    it("/history renvoie uniquement les calculs de l'utilisateur connecté", async () => {
        const tokenBob = tokenFor("bob");
        await request(server, "/calculate?operation=multiply&a=6&b=7", "GET", auth(tokenBob));
        await request(server, "/calculate?operation=subtract&a=9&b=4", "GET", auth(tokenBob));

        const res = await request(server, "/history", "GET", auth(tokenBob));
        expect(res.status).toBe(200);
        expect(res.body.userId).toBe("bob");
        expect(res.body.count).toBe(2);
        // du plus récent au plus ancien
        expect(res.body.history[0].operation).toBe("subtract");
        // ne contient pas les calculs d'alice
        expect(res.body.history.every((h) => h.operation !== "add")).toBe(true);
    });
});
