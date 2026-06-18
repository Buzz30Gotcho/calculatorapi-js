const js = require("@eslint/js");

module.exports = [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            globals: {
                // Environnement Node.js (Plus besoin de l'import 'globals')
                require: "readonly",
                module: "readonly",
                exports: "readonly",
                process: "readonly",
                console: "readonly",
                __dirname: "readonly",
                __filename: "readonly",

                // Environnement Jest (Comme ça, plus besoin des commentaires dans les tests)
                describe: "readonly",
                test: "readonly",
                it: "readonly",
                expect: "readonly",
                beforeEach: "readonly",
                beforeAll: "readonly",
                afterEach: "readonly",
                afterAll: "readonly",
                jest: "readonly"
            },
        },
        rules: {
            "no-unused-vars": "warn",
            "no-console": "off",
        },
    },
];