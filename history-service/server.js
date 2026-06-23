const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { Pool } = require('pg');
const { verifyAuth } = require('./auth');

const app = express();
const PORT = process.env.PORT || 4500;

// --- Connexion à PostgreSQL (le service "db")
const pool = new Pool({
    host: process.env.PGHOST || 'db',
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || 'calc',
    password: process.env.PGPASSWORD || 'calc',
    database: process.env.PGDATABASE || 'calc_history',
});

app.use(morgan('dev'));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// --- Middleware d'authentification (JWT Supabase)
function auth(req, res, next) {
    try {
        req.user = verifyAuth(req.headers.authorization);
        next();
    } catch (err) {
        res.status(err.status || 401).json({ error: err.message });
    }
}

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'history-service' });
});

// GET /history : l'historique de l'utilisateur connecté
app.get('/history', auth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, operation, a, b, result, created_at
             FROM calculations
             WHERE user_id = $1
             ORDER BY id DESC
             LIMIT 50`,
            [req.user.userId]
        );
        res.json({ userId: req.user.userId, count: rows.length, history: rows });
    } catch (err) {
        console.error('Erreur lecture historique :', err.message);
        res.status(500).json({ error: 'Erreur base de données.' });
    }
});

// POST /history : enregistre un calcul de l'utilisateur connecté
app.post('/history', auth, async (req, res) => {
    const { operation, a, b, result } = req.body || {};
    if (operation === undefined || a === undefined || b === undefined || result === undefined) {
        return res.status(400).json({ error: 'Champs requis : operation, a, b, result.' });
    }
    try {
        const { rows } = await pool.query(
            `INSERT INTO calculations (user_id, operation, a, b, result)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [req.user.userId, operation, Number(a), Number(b), Number(result)]
        );
        res.status(201).json({ id: rows[0].id, saved: true });
    } catch (err) {
        console.error('Erreur sauvegarde calcul :', err.message);
        res.status(500).json({ error: 'Erreur base de données.' });
    }
});

// --- Crée la table au démarrage (avec quelques tentatives, le temps que Postgres soit prêt)
async function initDb(retries = 15) {
    for (let i = 1; i <= retries; i++) {
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS calculations (
                    id          BIGSERIAL PRIMARY KEY,
                    user_id     TEXT NOT NULL,
                    operation   TEXT NOT NULL,
                    a           DOUBLE PRECISION NOT NULL,
                    b           DOUBLE PRECISION NOT NULL,
                    result      DOUBLE PRECISION NOT NULL,
                    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                CREATE INDEX IF NOT EXISTS calculations_user_idx
                    ON calculations (user_id, id DESC);
            `);
            console.log('✅ Base PostgreSQL prête (table calculations)');
            return;
        } catch (err) {
            console.log(`PostgreSQL pas prêt (tentative ${i}/${retries}) : ${err.message}`);
            await new Promise((r) => setTimeout(r, 2000));
        }
    }
    throw new Error('PostgreSQL injoignable après plusieurs tentatives.');
}

/* istanbul ignore next */
if (require.main === module) {
    initDb()
        .then(() => app.listen(PORT, () => console.log(`✅ history-service sur http://localhost:${PORT}`)))
        .catch((err) => {
            console.error(err.message);
            process.exit(1);
        });
}

module.exports = { app, pool, initDb };
