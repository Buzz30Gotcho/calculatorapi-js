const API_BASE = "http://localhost:3000";   // node-api (calculs + historique)
const AUTH_BASE = "http://localhost:4000";  // auth-service (Supabase)

const OP_SYMBOLS = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷",
};

// --- Éléments calculatrice ---
const displayEl = document.getElementById("display");
const expressionEl = document.getElementById("expression");
const errorEl = document.getElementById("error");
const apiStatusEl = document.getElementById("apiStatusValue");

// --- Éléments auth ---
const authScreen = document.getElementById("authScreen");
const appScreen = document.getElementById("appScreen");
const authForm = document.getElementById("authForm");
const authMsg = document.getElementById("authMsg");
const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const userEmailEl = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");
const historyList = document.getElementById("historyList");
const historyRefresh = document.getElementById("historyRefresh");

// Session : token JWT stocké dans le navigateur
const session = {
  token: localStorage.getItem("token") || null,
  email: localStorage.getItem("email") || null,
};

// État de la calculatrice
const state = {
  current: "0",
  previous: null,
  operation: null,
  justEvaluated: false,
};

// ============================================================
//  AUTHENTIFICATION
// ============================================================

function showAuthScreen() {
  authScreen.hidden = false;
  appScreen.hidden = true;
}

function showAppScreen() {
  authScreen.hidden = true;
  appScreen.hidden = false;
  userEmailEl.textContent = session.email || "";
  checkApi();
  loadHistory();
}

function setSession(token, email) {
  session.token = token;
  session.email = email;
  localStorage.setItem("token", token);
  localStorage.setItem("email", email);
}

function clearSession() {
  session.token = null;
  session.email = null;
  localStorage.removeItem("token");
  localStorage.removeItem("email");
}

async function authenticate(mode) {
  authMsg.textContent = "";
  const email = emailEl.value.trim();
  const password = passwordEl.value;
  if (!email || !password) {
    authMsg.textContent = "Email et mot de passe requis.";
    return;
  }

  const path = mode === "signup" ? "/auth/signup" : "/auth/login";
  try {
    const res = await fetch(`${AUTH_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      authMsg.textContent = data.error || "Échec de l'authentification.";
      return;
    }

    if (data.access_token) {
      setSession(data.access_token, (data.user && data.user.email) || email);
      authForm.reset();
      showAppScreen();
    } else {
      // Inscription avec confirmation d'email activée : pas de session immédiate
      authMsg.textContent = "Compte créé. Vérifie ton email puis connecte-toi.";
    }
  } catch (err) {
    authMsg.textContent = "Service d'authentification injoignable (port 4000 ?).";
  }
}

authForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const mode = e.submitter && e.submitter.dataset.mode === "signup" ? "signup" : "login";
  authenticate(mode);
});

logoutBtn.addEventListener("click", () => {
  clearSession();
  showAuthScreen();
});

// ============================================================
//  HISTORIQUE
// ============================================================

async function loadHistory() {
  if (!session.token) return;
  try {
    const res = await fetch(`${API_BASE}/history`, {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    if (res.status === 401) {
      // Token expiré → on déconnecte
      clearSession();
      showAuthScreen();
      return;
    }
    const data = await res.json();
    renderHistory(data.history || []);
  } catch {
    historyList.innerHTML = "<li class='history-empty'>Historique indisponible.</li>";
  }
}

function renderHistory(items) {
  if (items.length === 0) {
    historyList.innerHTML = "<li class='history-empty'>Aucun calcul pour l'instant.</li>";
    return;
  }
  historyList.innerHTML = items
    .map((h) => {
      const sym = OP_SYMBOLS[h.operation] || h.operation;
      return `<li><span>${h.a} ${sym} ${h.b}</span><strong>${h.result}</strong></li>`;
    })
    .join("");
}

historyRefresh.addEventListener("click", loadHistory);

// ============================================================
//  CALCULATRICE
// ============================================================

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
    const res = await fetch(url, {
      headers: session.token ? { Authorization: `Bearer ${session.token}` } : {},
    });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || "Erreur de calcul.");
      apiStatusEl.textContent = "connectée";
      return;
    }

    state.current = String(data.result);
    state.previous = null;
    state.operation = null;
    state.justEvaluated = true;
    apiStatusEl.textContent = "connectée";
    render();
    expressionEl.textContent = `${a} ${OP_SYMBOLS[operation]} ${b} =`;

    if (data.saved) {
      loadHistory(); // rafraîchir l'historique après un calcul enregistré
    }
  } catch (err) {
    apiStatusEl.textContent = "hors ligne";
    showError("Impossible de joindre l'API (le serveur tourne-t-il sur le port 3000 ?).");
  }
}

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

window.addEventListener("keydown", (e) => {
  if (appScreen.hidden) return; // pas de raccourcis sur l'écran de connexion
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

async function checkApi() {
  try {
    const res = await fetch(`${API_BASE}/calculate?operation=add&a=0&b=0`);
    apiStatusEl.textContent = res.ok ? "connectée" : "erreur";
  } catch {
    apiStatusEl.textContent = "hors ligne";
  }
}

// ============================================================
//  DÉMARRAGE : connecté ? -> calculatrice, sinon -> login
// ============================================================
clearAll();
if (session.token) {
  showAppScreen();
} else {
  showAuthScreen();
}
