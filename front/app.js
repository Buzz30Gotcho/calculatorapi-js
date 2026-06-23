const API_BASE = "http://localhost:3000";   // node-api (calculs + historique)
const AUTH_BASE = "http://localhost:4000";  // auth-service (Supabase)

const OP_SYMBOLS = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷",
};

const displayEl = document.getElementById("display");
const expressionEl = document.getElementById("expression");
const errorEl = document.getElementById("error");
const apiStatusEl = document.getElementById("apiStatusValue");

// État de la calculatrice
const state = {
  current: "0",   // nombre en cours de saisie
  previous: null, // premier opérande (string)
  operation: null,// 'add' | 'subtract' | 'multiply' | 'divide'
  justEvaluated: false,
};

function render() {
  displayEl.textContent = state.current;
  if (state.previous !== null && state.operation) {
    expressionEl.textContent = `${state.previous} ${OP_SYMBOLS[state.operation]}`;
  } else {
    expressionEl.textContent = "";
  }
}

function clearError() {
  errorEl.textContent = "";
}

function showError(message) {
  errorEl.textContent = message;
}

function inputDigit(digit) {
  clearError();
  if (state.justEvaluated) {
    state.current = "0";
    state.justEvaluated = false;
  }
  if (digit === ".") {
    if (state.current.includes(".")) return;
    state.current += ".";
  } else if (state.current === "0") {
    state.current = digit;
  } else {
    state.current += digit;
  }
  render();
}

function chooseOperation(op) {
  clearError();
  // Si une opération est déjà en attente, on évalue d'abord (chaînage)
  if (state.operation && state.previous !== null && !state.justEvaluated) {
    evaluate().then(() => {
      state.previous = state.current;
      state.operation = op;
      state.current = "0";
      state.justEvaluated = false;
      render();
    });
    return;
  }
  state.previous = state.current;
  state.operation = op;
  state.current = "0";
  state.justEvaluated = false;
  render();
}

function clearAll() {
  state.current = "0";
  state.previous = null;
  state.operation = null;
  state.justEvaluated = false;
  clearError();
  render();
}

function deleteLast() {
  clearError();
  if (state.justEvaluated) return;
  if (state.current.length <= 1 || (state.current.length === 2 && state.current.startsWith("-"))) {
    state.current = "0";
  } else {
    state.current = state.current.slice(0, -1);
  }
  render();
}

function toggleSign() {
  clearError();
  if (state.current === "0") return;
  state.current = state.current.startsWith("-")
    ? state.current.slice(1)
    : "-" + state.current;
  render();
}

async function evaluate() {
  if (!state.operation || state.previous === null) return;

  const a = state.previous;
  const b = state.current;
  const operation = state.operation;

  const url = `${API_BASE}/calculate?operation=${operation}&a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || "Erreur de calcul.");
      apiStatusEl.textContent = "connectée";
      return;
    }

    // Affiche l'opération complète en haut de l'écran
    expressionEl.textContent = `${a} ${OP_SYMBOLS[operation]} ${b} =`;
    state.current = String(data.result); // convertit en string
    state.previous = null;
    state.operation = null;
    state.justEvaluated = true;
    apiStatusEl.textContent = "connectée";
    render();
    expressionEl.textContent = `${a} ${OP_SYMBOLS[operation]} ${b} =`;
  } catch (err) {
    apiStatusEl.textContent = "hors ligne";
    showError("Impossible de joindre l'API (le serveur tourne-t-il sur le port 3000 ?).");
  }
}

// Gestion des clics
document.querySelector(".keys").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  if (btn.dataset.digit !== undefined) {
    inputDigit(btn.dataset.digit);
  } else if (btn.dataset.op !== undefined) {
    chooseOperation(btn.dataset.op);
  } else if (btn.dataset.action === "equals") {
    evaluate();
  } else if (btn.dataset.action === "clear") {
    clearAll();
  } else if (btn.dataset.action === "delete") {
    deleteLast();
  } else if (btn.dataset.action === "sign") {
    toggleSign();
  }
});

// Support du clavier
window.addEventListener("keydown", (e) => {
  const key = e.key;
  if (/[0-9.]/.test(key)) {
    inputDigit(key);
  } else if (key === "+") {
    chooseOperation("add");
  } else if (key === "-") {
    chooseOperation("subtract");
  } else if (key === "*") {
    chooseOperation("multiply");
  } else if (key === "/") {
    e.preventDefault();
    chooseOperation("divide");
  } else if (key === "Enter" || key === "=") {
    e.preventDefault();
    evaluate();
  } else if (key === "Backspace") {
    deleteLast();
  } else if (key === "Escape") {
    clearAll();
  }
});

// Vérifie la disponibilité de l'API au chargement
async function checkApi() {
  try {
    const res = await fetch(`${API_BASE}/calculate?operation=add&a=0&b=0`);
    apiStatusEl.textContent = res.ok ? "connectée" : "erreur";
  } catch {
    apiStatusEl.textContent = "hors ligne";
  }
}

clearAll();
checkApi();
