const { signUp, signIn } = require("../src/supabase");

describe("client Supabase", () => {
    beforeEach(() => {
        process.env.SUPABASE_URL = "https://demo.supabase.co";
        process.env.SUPABASE_ANON_KEY = "anon-key";
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("signUp appelle le bon endpoint avec apikey et renvoie les données", async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ user: { id: "u1", email: "a@b.com" } }),
        });

        const data = await signUp("a@b.com", "secret");

        expect(data.user.id).toBe("u1");
        const [calledUrl, options] = global.fetch.mock.calls[0];
        expect(calledUrl).toBe("https://demo.supabase.co/auth/v1/signup");
        expect(options.method).toBe("POST");
        expect(options.headers.apikey).toBe("anon-key");
        expect(JSON.parse(options.body)).toEqual({ email: "a@b.com", password: "secret" });
    });

    it("signIn utilise le grant_type=password", async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ access_token: "jwt-123" }),
        });

        const data = await signIn("a@b.com", "secret");

        expect(data.access_token).toBe("jwt-123");
        expect(global.fetch.mock.calls[0][0]).toBe(
            "https://demo.supabase.co/auth/v1/token?grant_type=password"
        );
    });

    it("propage l'erreur Supabase avec son status", async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 400,
            json: async () => ({ error_description: "Invalid login credentials" }),
        });

        await expect(signIn("a@b.com", "wrong")).rejects.toMatchObject({
            message: "Invalid login credentials",
            status: 400,
        });
    });

    it("lève une erreur 500 si la config Supabase est absente", async () => {
        delete process.env.SUPABASE_URL;
        await expect(signUp("a@b.com", "secret")).rejects.toMatchObject({ status: 500 });
    });
});
