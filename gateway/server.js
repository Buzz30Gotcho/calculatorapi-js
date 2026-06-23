const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 8088;


const CALC_BACKEND = process.env.CALC_BACKEND || 'http://python-api:3002';
const AUTH_URL = process.env.AUTH_URL || 'http://auth-service:4000';
const HISTORY_URL = process.env.HISTORY_URL || 'http://history-service:4500';

// --- Logs et CORS
app.use(morgan('dev'));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));


const routes = [
    { path: '/calculate', target: CALC_BACKEND },
    { path: '/auth', target: AUTH_URL },
    { path: '/history', target: HISTORY_URL },
];

console.log('\n=== 🚀 API Gateway calculatrice ===');
routes.forEach(({ path, target }) => {
    console.log(`${path.padEnd(12)} → ${target}`);
});

routes.forEach(({ path, target }) => {
    // On filtre par "path" mais on monte à la racine : ainsi le chemin complet
    // (/calculate, /auth/login, /history) est transmis tel quel au back.
    app.use(
        createProxyMiddleware(path, {
            target,
            changeOrigin: true,
            onProxyReq: (proxyReq, req) => {
                // On transmet le token Supabase aux back (pour /history et la sauvegarde)
                if (req.headers.authorization) {
                    proxyReq.setHeader('Authorization', req.headers.authorization);
                }
            }
        })
    );
});

// Petit point de santé pour vérifier que le gateway tourne
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'gateway', calcBackend: CALC_BACKEND });
});

app.listen(PORT, () => {
    console.log(`✅ API Gateway sur http://localhost:${PORT}`);
});
