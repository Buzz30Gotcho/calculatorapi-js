const http = require('http');
const url = require('url');
const Calculator = require('./calculator');

const PORT = 3000;

// node-api est un service de CALCUL pur (comme java-api et python-api).
// La persistance de l'historique est gérée par un service dédié
// (history-service + PostgreSQL), plus par ce service.
function requestHandler(req, res) {
    // 1. Headers CORS sur toutes les réponses
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // 2. Préflight CORS
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    // 3. Seul GET est autorisé
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET, OPTIONS');
        res.writeHead(405);
        return res.end(JSON.stringify({ error: "Méthode non autorisée. Utiliser GET." }));
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    // 4. Seule la route /calculate existe
    if (pathname !== '/calculate') {
        res.writeHead(404);
        return res.end(JSON.stringify({ error: "Route introuvable." }));
    }

    const { operation, a, b } = query;

    // 5. Paramètres requis
    if (operation === undefined || a === undefined || b === undefined || operation === '' || a === '' || b === '') {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "Paramètres attendus : operation, a, b" }));
    }

    // 6. a et b doivent être numériques
    const numA = Number(a);
    const numB = Number(b);
    if (isNaN(numA) || isNaN(numB)) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "Les paramètres a et b doivent être des nombres." }));
    }

    // 7. Opération connue
    const validOperations = ['add', 'subtract', 'multiply', 'divide'];
    if (!validOperations.includes(operation)) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "Opération inconnue. Utiliser : add, subtract, multiply, divide" }));
    }

    try {
        const calculator = new Calculator();
        const result = calculator[operation](numA, numB);
        res.writeHead(200);
        return res.end(JSON.stringify({ operation, a: numA, b: numB, result }));
    } catch (error) {
        // ex : "Division par zéro impossible."
        res.writeHead(400);
        return res.end(JSON.stringify({ error: error.message }));
    }
}

const server = http.createServer(requestHandler);

module.exports = { requestHandler, server };

/* istanbul ignore next : bloc de démarrage exécuté uniquement hors tests */
if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });
}
