// Le front ne parle qu'à la passerelle (API gateway) : elle route /calculate
// (avec failover node->java->python), /history et /auth/* vers les bons back.
const GATEWAY = "http://localhost:8088";
const API_BASE = GATEWAY;   // /calculate + /history
const AUTH_BASE = GATEWAY;  // /auth/login + /auth/signup

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

// --- Éléments d'authentification / historique ---
const authScreen = document.getElementById("authScreen");
const appScreen = document.getElementById("appScreen");
const authForm = document.getElementById("authForm");
const authMsg = document.getElementById("authMsg");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const logoutBtn = document.getElementById("logoutBtn");
const historyListEl = document.getElementById("historyList");
const historyRefreshBtn = document.getElementById("historyRefresh");

const TOKEN_KEY = "calc_token";
const EMAIL_KEY = "calc_email";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// En-tête Authorization si l'utilisateur est connecté, sinon {} (calcul anonyme).
function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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
    // On envoie le token s'il existe : le backend enregistre alors le calcul.
    const res = await fetch(url, { headers: authHeaders() });
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
    // Si connecté, on demande au history-service d'enregistrer ce calcul.
    saveCalculation(operation, Number(a), Number(b), data.result);
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

// ====== Authentification ======

function showAuthMsg(message, isError = true) {
  authMsg.textContent = message;
  authMsg.style.color = isError ? "" : "green";
}

function showAuthScreen() {
  appScreen.hidden = true;
  authScreen.hidden = false;
}

function showAppScreen() {
  authScreen.hidden = true;
  appScreen.hidden = false;
  checkApi();
  loadHistory();
}

// mode = "login" | "signup"
async function handleAuth(mode) {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    return showAuthMsg("Email et mot de passe requis.");
  }

  const path = mode === "signup" ? "/auth/signup" : "/auth/login";
  showAuthMsg("Veuillez patienter…", false);

  try {
    const res = await fetch(`${AUTH_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      return showAuthMsg(data.error || "Échec de l'authentification.");
    }

    const token = data.access_token;
    if (!token) {
      // signup sans connexion automatique (ex : confirmation d'email requise)
      return showAuthMsg(
        "Compte créé. Confirmez votre email puis connectez-vous.",
        false
      );
    }

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EMAIL_KEY, email);
    showAuthMsg("");
    showAppScreen();
  } catch {
    showAuthMsg("Impossible de joindre l'auth-service (port 4000 ?).");
  }
}

authForm.addEventListener("submit", (e) => {
  e.preventDefault(); // empêche le rechargement de page (l'URL "?" disparaît)
  const mode =
    e.submitter && e.submitter.dataset.mode === "signup" ? "signup" : "login";
  handleAuth(mode);
});

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
  passwordInput.value = "";
  historyListEl.innerHTML = "";
  showAuthMsg("");
  showAuthScreen();
}

logoutBtn.addEventListener("click", logout);

// ====== Historique ======

// Enregistre un calcul via le history-service (uniquement si connecté).
async function saveCalculation(operation, a, b, result) {
  if (!getToken()) return;
  try {
    const res = await fetch(`${API_BASE}/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ operation, a, b, result }),
    });
    if (res.status === 401) return logout();
    if (res.ok) loadHistory();
  } catch {
    // L'historique n'est pas critique : on ignore une erreur réseau.
  }
}

async function loadHistory() {
  if (!getToken()) return;
  try {
    const res = await fetch(`${API_BASE}/history`, { headers: authHeaders() });
    if (res.status === 401) {
      return logout(); // token expiré ou invalide
    }
    if (!res.ok) return;
    const data = await res.json();
    renderHistory(data.history || []);
  } catch {
    // L'historique n'est pas critique : on ignore une erreur réseau.
  }
}

function renderHistory(items) {
  historyListEl.innerHTML = "";
  if (items.length === 0) {
    const li = document.createElement("li");
    li.className = "history-empty";
    li.textContent = "Aucun calcul pour le moment.";
    historyListEl.appendChild(li);
    return;
  }
  for (const item of items) {
    const li = document.createElement("li");
    const symbol = OP_SYMBOLS[item.operation] || item.operation;
    li.textContent = `${item.a} ${symbol} ${item.b} = ${item.result}`;
    historyListEl.appendChild(li);
  }
}

historyRefreshBtn.addEventListener("click", loadHistory);

// ====== Initialisation ======
clearAll();
if (getToken()) {
  // Session déjà ouverte : on va directement à la calculatrice.
  showAppScreen();
} else {
  showAuthScreen();
}
