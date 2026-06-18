// Base SQLite en mémoire pour les tests (doit être défini AVANT le require)
process.env.DB_PATH = ":memory:";

const { saveCalculation, getHistory, closeDb } = require("../src/db");

describe("db (SQLite historique)", () => {
    afterAll(() => closeDb());

    it("enregistre un calcul et le retrouve dans l'historique", () => {
        const id = saveCalculation({
            userId: "user-1",
            operation: "add",
            a: 2,
            b: 3,
            result: 5,
        });
        expect(typeof id).toBe("number");

        const history = getHistory("user-1");
        expect(history).toHaveLength(1);
        expect(history[0]).toMatchObject({ operation: "add", a: 2, b: 3, result: 5 });
        expect(history[0].created_at).toBeDefined();
    });

    it("isole l'historique par utilisateur", () => {
        saveCalculation({ userId: "user-2", operation: "multiply", a: 4, b: 5, result: 20 });

        const history1 = getHistory("user-1");
        const history2 = getHistory("user-2");

        expect(history2).toHaveLength(1);
        expect(history2[0].operation).toBe("multiply");
        // user-1 ne voit pas les calculs de user-2
        expect(history1.every((h) => h.operation !== "multiply")).toBe(true);
    });

    it("renvoie les calculs du plus récent au plus ancien", () => {
        saveCalculation({ userId: "user-3", operation: "add", a: 1, b: 1, result: 2 });
        saveCalculation({ userId: "user-3", operation: "subtract", a: 9, b: 4, result: 5 });

        const history = getHistory("user-3");
        expect(history[0].operation).toBe("subtract"); // le dernier inséré en premier
    });

    it("respecte la limite passée en paramètre", () => {
        for (let i = 0; i < 5; i++) {
            saveCalculation({ userId: "user-4", operation: "add", a: i, b: i, result: i + i });
        }
        expect(getHistory("user-4", 3)).toHaveLength(3);
    });
});
