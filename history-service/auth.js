const jwt = require("jsonwebtoken");

/** Erreur d'authentification (token manquant / invalide / config absente). */
class AuthError extends Error {
    constructor(message, status = 401) {
        super(message);
        this.name = "AuthError";
        this.status = status;
    }
}

/**
 * Vérifie l'en-tête Authorization "Bearer <token>".
 * Le token est un JWT émis par Supabase, vérifié avec le secret du projet (HS256).
 * Renvoie { userId, email } si valide, sinon lève une AuthError.
 */
function verifyAuth(authHeader) {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AuthError("Token d'authentification manquant.");
    }

    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
        throw new AuthError("Configuration auth manquante (SUPABASE_JWT_SECRET).", 500);
    }

    const token = authHeader.slice("Bearer ".length);
    try {
        const payload = jwt.verify(token, secret);
        return { userId: payload.sub, email: payload.email };
    } catch {
        throw new AuthError("Token invalide ou expiré.");
    }
}

module.exports = { verifyAuth, AuthError };
