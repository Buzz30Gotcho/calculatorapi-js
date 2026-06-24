# 🧮 Calculator API — une calculatrice en microservices

> Projet d'atelier Ynov : une **calculatrice web** dont le « cerveau » (le calcul)
> est codé **3 fois, dans 3 langages différents** (Node.js, Java, Python), tous
> interchangeables, le tout orchestré avec **Docker** et testé automatiquement
> par une **CI GitHub Actions**.

Ce README est écrit pour un·e **débutant·e** : on explique chaque brique, pourquoi
elle existe, et comment lancer le projet. Tout à la fin, il y a un **comparatif
chiffré** entre les 3 langages du back sur un point concret du projet.

---

## 1. C'est quoi, ce projet ?

À l'écran, c'est une simple calculatrice : on tape `3 + 6`, on obtient `9`.

Mais derrière ce bouton « = », il se passe beaucoup de choses :

1. La page web envoie le calcul à un **serveur**.
2. Le serveur calcule et renvoie le résultat.
3. Si tu es **connecté**, le calcul est **sauvegardé** dans un historique.

L'intérêt pédagogique du projet n'est PAS la calculatrice elle-même (additionner
deux nombres, c'est facile). L'intérêt, c'est **comment on construit, découpe,
conteneurise et teste une application moderne**. C'est un projet sur
l'**architecture** et les **tests**, déguisé en calculatrice.

---

## 2. C'est quoi le « mode microservices » ?

Imagine un restaurant.

- **Approche monolithe** (classique) : une seule personne prend la commande,
  cuisine, fait le service, encaisse et fait la vaisselle. Si elle tombe malade,
  tout s'arrête.
- **Approche microservices** (ce projet) : chaque tâche a sa propre personne
  spécialisée. Un serveur prend la commande, un cuisinier cuisine, un caissier
  encaisse. Chacun fait **une seule chose, mais bien**. On peut remplacer le
  cuisinier sans toucher au caissier.

Ici, le principe est : **« 1 service = 1 responsabilité »**. L'appli est donc
découpée en **plusieurs petits programmes indépendants** qui communiquent par le
réseau (HTTP).

### Les services du projet

| Service | Dossier | Rôle (en une phrase) | Techno |
|---|---|---|---|
| **Front (UX)** | `front/` | La page web de la calculatrice (ce que tu vois). | HTML / CSS / JS, servi par Nginx |
| **Gateway** | `gateway/` | Le « standard téléphonique » : reçoit toutes les requêtes et les redirige vers le bon service. | Node.js + Express |
| **Back de calcul** | `back/`, `back-java/`, `back-python/` | Fait le calcul. **3 versions interchangeables.** | Node / Java / Python |
| **Auth-service** | `auth-service/` | Gère l'inscription / connexion (via Supabase). | Node.js |
| **History-service** | `history-service/` | Enregistre et relit l'historique des calculs. | Node.js + PostgreSQL |
| **Base de données** | (image Docker) | Stocke l'historique de façon durable. | PostgreSQL 16 |

### Le point clé : 3 backs de calcul interchangeables

Les trois backs (`back/` en Node, `back-java/` en Java, `back-python/` en Python)
exposent **exactement la même API** :

```
GET /calculate?operation=add&a=3&b=6   →   200 {"operation":"add","a":3,"b":6,"result":9}
```

Ils sont donc **strictement interchangeables**. C'est toi qui **choisis lequel
faire tourner** (ce n'est PAS un système de secours automatique : on décide
explicitement quel back lancer). Le choix se fait au démarrage via un fichier
Docker Compose d'« override » — voir la section *Lancer le projet*.

---

## 3. Schéma de l'architecture

```mermaid
flowchart TD
    U[Navigateur<br/>http://localhost:8081] --> F[Front / UX<br/>Nginx]
    F -->|toutes les requetes| GW[Gateway<br/>Express - port 8088]

    GW -->|/calculate| CALC{Back de calcul<br/>UN SEUL au choix}
    GW -->|/auth/*| AUTH[Auth-service<br/>port 4000]
    GW -->|/history| HIST[History-service<br/>port 4500]

    CALC -.->|option 1| NODE[Node.js - 3000]
    CALC -.->|option 2| JAVA[Java - 3001]
    CALC -.->|option 3| PY[Python - 3002]

    AUTH --> SUPA[(Supabase<br/>auth externe)]
    HIST --> DB[(PostgreSQL 16)]
```

### Que se passe-t-il quand on clique sur « = » ?

```mermaid
sequenceDiagram
    participant U as Navigateur
    participant G as Gateway
    participant C as Back de calcul
    participant H as History-service
    participant DB as PostgreSQL

    U->>G: GET /calculate?operation=add&a=3&b=6
    G->>C: redirige vers le back choisi
    C-->>G: { result: 9 }
    G-->>U: { result: 9 }
    Note over U: Si l'utilisateur est connecte...
    U->>G: POST /history (resultat + token)
    G->>H: redirige (avec le token)
    H->>DB: INSERT du calcul
    DB-->>H: ok
    H-->>U: enregistre
```

Point important : **la sauvegarde est indépendante du back de calcul**. Que le
calcul ait été fait par Node, Java ou Python, c'est toujours `history-service`
(+ PostgreSQL) qui le stocke. Chaque service ne s'occupe que de SA tâche.

---

## 4. Les langages et technologies utilisés

| Couche | Technologies |
|---|---|
| **Front** | HTML, CSS, JavaScript « vanilla » (sans framework), servi par **Nginx** |
| **Gateway** | **Node.js** + **Express** + `http-proxy-middleware` + `cors` + `morgan` |
| **Back de calcul** | **Node.js** (module `http`), **Java 17** (`com.sun.net.httpserver`), **Python 3.12** (`http.server`) |
| **Auth** | **Node.js** + **Supabase** (service d'authentification externe, JWT) |
| **Historique** | **Node.js** + **Express** + **PostgreSQL** (`pg`) + `jsonwebtoken` |
| **Tests** | **Jest** (Node), **JUnit 5** (Java), **pytest** (Python), **Playwright** (tests end-to-end) |
| **Conteneurs** | **Docker** + **Docker Compose** |
| **CI/CD** | **GitHub Actions** |

> 💡 **Détail volontaire et intéressant :** les 3 backs de calcul n'utilisent
> **aucun framework web ni aucune dépendance externe**. Chacun se contente du
> **serveur HTTP intégré à son langage**. C'est un choix pédagogique : voir
> comment chaque langage gère « à la main » le même problème (router une URL,
> lire des paramètres, renvoyer du JSON). C'est aussi ce qui rend le comparatif
> de la section 7 honnête : on compare des choses vraiment équivalentes.

---

## 5. Lancer le projet

### Prérequis
- **Docker** et **Docker Compose** installés.

### Démarrer la stack avec le back de ton choix

La base (gateway, auth, history, base de données, front) est dans
`docker-compose.yml`. Le **back de calcul n'y est pas** : on l'ajoute avec un
fichier d'« override » selon le langage voulu.

```bash
# Avec le back Python (le défaut du projet)
docker compose -f docker-compose.yml -f compose.python.yml up -d --build

# Avec le back Java
docker compose -f docker-compose.yml -f compose.java.yml up -d --build

# Avec le back Node.js
docker compose -f docker-compose.yml -f compose.node.yml up -d --build
```

Puis ouvre **http://localhost:8081** 🎉

> ⚠️ **Piège à connaître :** pour **arrêter** la stack, il faut **repasser le
> même override**, sinon le conteneur du back ne sera pas arrêté (la base ne le
> connaît pas) :
> ```bash
> docker compose -f docker-compose.yml -f compose.python.yml down
> ```

### Les ports utilisés

| Port | Service |
|---|---|
| `8081` | Front (la page web) |
| `8088` | Gateway (point d'entrée des requêtes) |
| `4000` | Auth-service |
| `4500` | History-service |
| `3000 / 3001 / 3002` | Back Node / Java / Python (interne) |

---

## 6. Les tests

Chaque service a ses propres tests, et la CI vérifie tout à chaque `push`.

| Back | Outil | Nb de tests | Comment lancer |
|---|---|---|---|
| Node (`back/`) | Jest | **53** | `npm test` |
| Java (`back-java/`) | JUnit 5 | **30** | `mvn test` |
| Python (`back-python/`) | pytest | **30** | `python -m pytest` |
| Auth (`auth-service/`) | Jest | — | `npm test` |
| Bout-en-bout (`e2e/`) | Playwright | — | `npx playwright test` |

### Le pipeline CI (GitHub Actions, `.github/workflows/ci.yml`)

```mermaid
flowchart LR
    L[Lint ESLint] --> TN[Tests Node]
    L --> TJ[Tests Java]
    L --> TP[Tests Python]
    L --> TA[Tests Auth]
    TN --> D[Build + smoke test Docker]
    TJ --> D
    TP --> D
    TA --> D
    TN --> E[E2E Playwright x3 backends]
    TJ --> E
    TP --> E
    TA --> E
```

Les tests E2E sont lancés **3 fois** (un job par backend : node, java, python),
ce qui **prouve que les 3 backs sont vraiment interchangeables** : la même page
web et les mêmes scénarios passent quel que soit le langage derrière.

---

## 7. ⭐ Comparatif des 3 langages : la vitesse des tests

C'est le point concret demandé. Le projet implémente **le même back de calcul,
avec la même API, en n'utilisant que la bibliothèque standard de chaque langage**.
On peut donc comparer équitablement un point précis : **combien de temps prend la
suite de tests unitaires de chaque langage ?**

> ⚙️ Mesures faites en local sur la machine de dev (commande `time`). Les chiffres
> absolus varient d'une machine à l'autre, mais l'**ordre de grandeur** entre
> langages est ce qui compte.

| Langage | Outil de test | Nb de tests | Temps « moteur » de test | Temps total (lancement inclus) |
|---|---|---|---|---|
| 🟢 **Python** | pytest | 30 | ~0,54 s | **~0,66 s** |
| 🟡 **Node.js** | Jest | 53 | ~0,29 s | **~1,0 s** |
| 🔴 **Java** | JUnit + Maven | 30 | ~0,07 s | **~2,6 s** |

```mermaid
xychart-beta
    title "Temps total pour lancer la suite de tests (plus bas = plus rapide)"
    x-axis ["Python (pytest)", "Node.js (Jest)", "Java (Maven)"]
    y-axis "Secondes" 0 --> 3
    bar [0.66, 1.0, 2.6]
```

### Comment lire ces chiffres ?

- **Python est le plus rapide à démarrer.** L'interpréteur se lance quasi
  instantanément et pytest a très peu de surcharge. Idéal pour la boucle
  « je modifie → je teste » en développement.
- **Node.js / Jest est entre les deux.** Le calcul pur est ultra-rapide (Jest
  exécute 53 tests en ~0,29 s !), mais Jest démarre tout un framework
  (transformation, workers parallèles), d'où ~1 s au total.
- **Java est le plus lent à lancer… mais pour une bonne raison.** Le temps part
  surtout dans le **démarrage de la JVM** et de **Maven** (compilation comprise).
  Une fois lancée, l'exécution des tests est la plus rapide des trois (~0,07 s).
  Sur un gros projet avec des milliers de tests, cet « impôt de démarrage » se
  rentabilise ; sur un micro-projet comme celui-ci, il pèse lourd en proportion.

### La leçon à retenir

| Critère | Gagnant | Pourquoi |
|---|---|---|
| Démarrage le plus rapide | 🟢 Python | Interpréteur instantané, outillage léger |
| Exécution pure la plus rapide | 🔴 Java | Code compilé + JVM optimisée |
| Meilleur compromis pour ce projet | 🟢 Python | Petit projet → le démarrage rapide domine |

👉 **Conclusion :** il n'y a pas de « meilleur langage » dans l'absolu. Pour un
**petit projet** où on relance souvent les tests, le **démarrage rapide de Python
(ou Node)** est plus agréable. Pour un **gros projet** où l'exécution domine, la
**vitesse brute de Java** finit par payer. Ce projet, en codant la *même* chose
trois fois, permet de **toucher du doigt** ce compromis au lieu de le lire dans
un cours.

---

## 8. Arborescence du projet

```
calculatorapi-js/
├── front/                 # La page web (HTML/CSS/JS + Nginx)
├── gateway/               # Le standard téléphonique (Express)
├── back/                  # Back de calcul — Node.js
├── back-java/             # Back de calcul — Java 17 (Maven)
├── back-python/           # Back de calcul — Python 3.12
├── auth-service/          # Inscription / connexion (Supabase)
├── history-service/       # Historique des calculs (+ PostgreSQL)
├── e2e/                   # Tests bout-en-bout (Playwright)
├── docker-compose.yml     # Stack de base (sans back de calcul)
├── compose.node.yml       # Override : ajoute le back Node
├── compose.java.yml       # Override : ajoute le back Java
├── compose.python.yml     # Override : ajoute le back Python
└── .github/workflows/ci.yml  # Pipeline CI (lint + tests + Docker + E2E)
```

---

## 9. En résumé

- Une **calculatrice web** simple en façade…
- …mais une vraie **architecture microservices** derrière (« 1 service = 1 rôle »).
- Le **cœur de calcul est écrit 3 fois** (Node, Java, Python), tous
  interchangeables, ce qui permet de **comparer les langages** sur un même
  terrain.
- Tout est **conteneurisé** (Docker) et **testé automatiquement** (CI :
  lint, tests unitaires des 3 langages, build Docker, E2E sur les 3 backends).
- Bonus pédagogique : un **comparatif chiffré** de la vitesse des tests qui
  montre concrètement les compromis Python vs Node vs Java.
