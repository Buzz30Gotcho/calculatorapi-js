const jwt = require("jsonwebtoken");
const { verifyAuth, AuthError } = require("../src/auth");

const SECRET = "test-secret";

function makeToken(payload, options = {}) {
    return jwt.sign(payload, SECRET, options);
}

describe("auth (vérification JWT Supabase)", () => {
    beforeEach(() => {
        process.env.SUPABASE_JWT_SECRET = SECRET;
    });

    it("accepte un token valide et renvoie userId + email", () => {
        const token = makeToken({ sub: "user-123", email: "a@b.com" });
        const user = verifyAuth(`Bearer ${token}`);
        expect(user).toEqual({ userId: "user-123", email: "a@b.com" });
    });

    it("rejette une absence d'en-tête (401)", () => {
        expect(() => verifyAuth(undefined)).toThrow(AuthError);
        try {
            verifyAuth(undefined);
        } catch (e) {
            expect(e.status).toBe(401);
            expect(e.message).toMatch(/manquant/);
        }
    });

    it("rejette un en-tête mal formé (sans Bearer)", () => {
        expect(() => verifyAuth("token-sans-bearer")).toThrow("Token d'authentification manquant.");
    });

    it("rejette un token signé avec un mauvais secret", () => {
        const token = jwt.sign({ sub: "x" }, "autre-secret");
        expect(() => verifyAuth(`Bearer ${token}`)).toThrow("Token invalide ou expiré.");
    });

    it("rejette un token expiré", () => {
        const token = makeToken({ sub: "x" }, { expiresIn: -10 });
        expect(() => verifyAuth(`Bearer ${token}`)).toThrow("Token invalide ou expiré.");
    });

    it("renvoie une erreur 500 si la config secret est absente", () => {
        delete process.env.SUPABASE_JWT_SECRET;
        const token = jwt.sign({ sub: "x" }, SECRET);
        try {
            verifyAuth(`Bearer ${token}`);
            throw new Error("aurait dû lever");
        } catch (e) {
            expect(e).toBeInstanceOf(AuthError);
            expect(e.status).toBe(500);
        }
    });
});
