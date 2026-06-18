const http = require('http');
const url = require('url');
const Calculator = require('./calculator'); // Ajuste le chemin si nécessaire
const { saveCalculation, getHistory } = require('./db');
const { verifyAuth, AuthError } = require('./auth');

const PORT = 3000;

function requestHandler(req, res) {
    // 1. Positionner les headers CORS sur toutes les réponses
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // 2. Si méthode OPTIONS → répondre 204 vide et stopper
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    // 3. Si méthode ≠ GET → répondre 405 avec header Allow
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET, OPTIONS');
        res.writeHead(405);
        return res.end(JSON.stringify({ error: "Méthode non autorisée. Utiliser GET." }));
    }

    // Extraction des informations de l'URL
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    // Route protégée : historique de l'utilisateur connecté
    if (pathname === '/history') {
        return handleHistory(req, res);
    }

    // 4. Si pathname ≠ /calculate → répondre 404
    if (pathname !== '/calculate') {
        res.writeHead(404);
        return res.end(JSON.stringify({ error: "Route introuvable." }));
    }

    const { operation, a, b } = query;

    // 5. Si operation, a ou b sont absents de la query string → répondre 400
    if (operation === undefined || a === undefined || b === undefined || operation === '' || a === '' || b === '') {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "Paramètres attendus : operation, a, b" }));
    }

    // 6. Convertir a et b en Number ; si NaN → répondre 400
    const numA = Number(a);
    const numB = Number(b);

    if (isNaN(numA) || isNaN(numB)) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "Les paramètres a et b doivent être des nombres." }));
    }

    // 7. Vérifier si l'opération est inconnue avant de l'exécuter
    const validOperations = ['add', 'subtract', 'multiply', 'divide'];
    if (!validOperations.includes(operation)) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "Opération inconnue. Utiliser : add, subtract, multiply, divide" }));
    }

    try {
        // Instanciation de Calculator comme dans ton fichier de test
        const calculator = new Calculator();

        // Appel dynamique de la méthode (ex: calculator['add'](5, 3))
        const result = calculator[operation](numA, numB);

        // Si l'utilisateur est authentifié, on enregistre le calcul dans l'historique.
        // Calcul anonyme = autorisé mais non sauvegardé.
        const user = tryGetUser(req);
        if (user) {
            saveCalculation({ userId: user.userId, operation, a: numA, b: numB, result });
        }

        // 9. Répondre 200 avec le JSON de succès
        res.writeHead(200);
        return res.end(JSON.stringify({
            operation: operation,
            a: numA,
            b: numB,
            result: result,
            saved: Boolean(user)
        }));

    } catch (error) {
        // 8. Attrape l'erreur "Division par zéro impossible." lancée par calculator.divide()
        res.writeHead(400);
        return res.end(JSON.stringify({ error: error.message }));
    }
}

// Renvoie l'utilisateur si le token est valide, sinon null (sans lever d'erreur).
function tryGetUser(req) {
    try {
        return verifyAuth(req.headers.authorization);
    } catch {
        return null;
    }
}

// GET /history : nécessite un token valide, renvoie l'historique de l'utilisateur.
function handleHistory(req, res) {
    let user;
    try {
        user = verifyAuth(req.headers.authorization);
    } catch (error) {
        const status = error instanceof AuthError ? error.status : 401;
        res.writeHead(status);
        return res.end(JSON.stringify({ error: error.message }));
    }

    const history = getHistory(user.userId);
    res.writeHead(200);
    return res.end(JSON.stringify({ userId: user.userId, count: history.length, history }));
}

// Création du serveur HTTP
const server = http.createServer(requestHandler);

// Contraintes d'implémentation pour les tests
module.exports = { requestHandler, server };

/* istanbul ignore next : bloc de démarrage exécuté uniquement hors tests */
if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });
}
