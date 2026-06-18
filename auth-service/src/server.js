const http = require("http");
const { signUp, signIn } = require("./supabase");

const PORT = 4000;

function setCors(res) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function send(res, status, payload) {
    res.writeHead(status);
    res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
    return new Promise((resolve) => {
        let data = "";
        req.on("data", (chunk) => {
            data += chunk;
        });
        req.on("end", () => {
            if (!data) {
                return resolve({});
            }
            try {
                resolve(JSON.parse(data));
            } catch {
                resolve(null); // null = JSON invalide
            }
        });
    });
}

async function requestHandler(req, res) {
    setCors(res);

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        return res.end();
    }

    const pathname = req.url.split("?")[0];

    if (req.method === "GET" && pathname === "/health") {
        return send(res, 200, { status: "ok", service: "auth-service" });
    }

    if (pathname === "/auth/signup" || pathname === "/auth/login") {
        if (req.method !== "POST") {
            res.setHeader("Allow", "POST, OPTIONS");
            return send(res, 405, { error: "Méthode non autorisée. Utiliser POST." });
        }

        const body = await readJsonBody(req);
        if (body === null) {
            return send(res, 400, { error: "Corps JSON invalide." });
        }

        const { email, password } = body;
        if (!email || !password) {
            return send(res, 400, { error: "Champs requis : email, password." });
        }

        try {
            const data =
                pathname === "/auth/signup"
                    ? await signUp(email, password)
                    : await signIn(email, password);
            return send(res, 200, data);
        } catch (error) {
            return send(res, error.status || 502, { error: error.message });
        }
    }

    return send(res, 404, { error: "Route introuvable." });
}

const server = http.createServer(requestHandler);

module.exports = { requestHandler, server };

/* istanbul ignore next : bloc de démarrage exécuté uniquement hors tests */
if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`auth-service démarré sur http://localhost:${PORT}`);
    });
}
