const http = require("http");
const { requestHandler } = require("../src/server");
const { request } = require("./helpers/http");

describe("auth-service (routes HTTP)", () => {
    let server;

    beforeAll((done) => {
        process.env.SUPABASE_URL = "https://demo.supabase.co";
        process.env.SUPABASE_ANON_KEY = "anon-key";
        server = http.createServer(requestHandler);
        server.listen(0, "127.0.0.1", done);
    });

    afterAll((done) => {
        server.close(done);
    });

    beforeEach(() => {
        global.fetch = jest.fn();
    });
    afterEach(() => jest.restoreAllMocks());

    it("GET /health renvoie ok", async () => {
        const res = await request(server, "/health");
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
    });

    it("POST /auth/signup renvoie la session Supabase", async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ user: { id: "u1" }, access_token: "jwt" }),
        });
        const res = await request(server, "/auth/signup", {
            method: "POST",
            body: { email: "a@b.com", password: "secret" },
        });
        expect(res.status).toBe(200);
        expect(res.body.access_token).toBe("jwt");
    });

    it("POST /auth/login renvoie un access_token", async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ access_token: "jwt-login" }),
        });
        const res = await request(server, "/auth/login", {
            method: "POST",
            body: { email: "a@b.com", password: "secret" },
        });
        expect(res.status).toBe(200);
        expect(res.body.access_token).toBe("jwt-login");
    });

    it("400 si email ou password manquant", async () => {
        const res = await request(server, "/auth/login", {
            method: "POST",
            body: { email: "a@b.com" },
        });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Champs requis/);
    });

    it("400 si le corps JSON est invalide", async () => {
        // envoi d'un corps non-JSON
        const res = await new Promise((resolve, reject) => {
            const addr = server.address();
            const r = http.request(
                {
                    hostname: "127.0.0.1",
                    port: addr.port,
                    path: "/auth/login",
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                },
                (resp) => {
                    let d = "";
                    resp.on("data", (c) => (d += c));
                    resp.on("end", () => resolve({ status: resp.statusCode, body: JSON.parse(d) }));
                }
            );
            r.on("error", reject);
            r.write("{pas du json");
            r.end();
        });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/JSON invalide/);
    });

    it("405 si on appelle /auth/login en GET", async () => {
        const res = await request(server, "/auth/login", { method: "GET" });
        expect(res.status).toBe(405);
    });

    it("propage l'erreur Supabase (mauvais identifiants)", async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 400,
            json: async () => ({ error_description: "Invalid login credentials" }),
        });
        const res = await request(server, "/auth/login", {
            method: "POST",
            body: { email: "a@b.com", password: "wrong" },
        });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Invalid login credentials");
    });

    it("404 sur une route inconnue", async () => {
        const res = await request(server, "/nope");
        expect(res.status).toBe(404);
    });

    it("204 sur une requête OPTIONS (CORS preflight)", async () => {
        const res = await request(server, "/auth/login", { method: "OPTIONS" });
        expect(res.status).toBe(204);
    });
});
