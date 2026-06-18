const http = require("http");

/** Envoie une requête HTTP (avec corps JSON optionnel) à un serveur de test. */
function request(server, path, { method = "GET", body, headers = {} } = {}) {
    return new Promise((resolve, reject) => {
        const addr = server.address();
        const payload = body !== undefined ? JSON.stringify(body) : null;
        const finalHeaders = { ...headers };
        if (payload) {
            finalHeaders["Content-Type"] = "application/json";
            finalHeaders["Content-Length"] = Buffer.byteLength(payload);
        }

        const req = http.request(
            { hostname: "127.0.0.1", port: addr.port, path, method, headers: finalHeaders },
            (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () =>
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: data ? JSON.parse(data) : null,
                    })
                );
            }
        );
        req.on("error", reject);
        if (payload) {
            req.write(payload);
        }
        req.end();
    });
}

module.exports = { request };
