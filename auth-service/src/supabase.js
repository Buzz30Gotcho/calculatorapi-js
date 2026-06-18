/**
 * Client minimal vers l'API d'authentification Supabase (GoTrue),
 * via fetch natif — pas de dépendance externe.
 *
 * Variables d'environnement requises :
 *   SUPABASE_URL       ex: https://xxxx.supabase.co
 *   SUPABASE_ANON_KEY  la clé "anon public" du projet
 */

async function supabaseAuth(pathWithQuery, body) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
        const error = new Error(
            "Configuration Supabase manquante (SUPABASE_URL / SUPABASE_ANON_KEY)."
        );
        error.status = 500;
        throw error;
    }

    const response = await fetch(`${url}/auth/v1/${pathWithQuery}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            apikey: key,
            Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(
            data.error_description || data.msg || data.error || "Erreur Supabase."
        );
        error.status = response.status;
        throw error;
    }

    return data;
}

/** Inscription : crée un utilisateur Supabase. */
function signUp(email, password) {
    return supabaseAuth("signup", { email, password });
}

/** Connexion : renvoie une session (access_token = JWT à utiliser ensuite). */
function signIn(email, password) {
    return supabaseAuth("token?grant_type=password", { email, password });
}

module.exports = { supabaseAuth, signUp, signIn };
