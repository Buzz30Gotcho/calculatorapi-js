const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

// Chemin du fichier SQLite. ":memory:" est pratique pour les tests.
const DB_PATH =
    process.env.DB_PATH || path.join(__dirname, "..", "data", "history.db");

let db;

function getDb() {
    if (!db) {
        if (DB_PATH !== ":memory:") {
            fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
        }
        db = new Database(DB_PATH);
        db.pragma("journal_mode = WAL");
        db.exec(`
            CREATE TABLE IF NOT EXISTS calculations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                operation TEXT NOT NULL,
                a REAL NOT NULL,
                b REAL NOT NULL,
                result REAL NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        `);
    }
    return db;
}

function saveCalculation({ userId, operation, a, b, result }) {
    const stmt = getDb().prepare(
        `INSERT INTO calculations (user_id, operation, a, b, result)
         VALUES (?, ?, ?, ?, ?)`
    );
    const info = stmt.run(userId, operation, a, b, result);
    return info.lastInsertRowid;
}

function getHistory(userId, limit = 50) {
    const stmt = getDb().prepare(
        `SELECT id, operation, a, b, result, created_at
         FROM calculations
         WHERE user_id = ?
         ORDER BY id DESC
         LIMIT ?`
    );
    return stmt.all(userId, limit);
}

function closeDb() {
    if (db) {
        db.close();
        db = undefined;
    }
}

module.exports = { getDb, saveCalculation, getHistory, closeDb, DB_PATH };
