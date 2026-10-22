# 26-01-kd-dev-web-matin-c-mon-thu-kin-capstone-kadea-chat-veben-cmyk
# Kadea Chat

Application de messagerie instantanée fullstack réalisée pour **Kadea Academy** dans le cadre du projet final de la formation en développement web.

🔗 **Site hébergé :** https://two6-01-kd-dev-web-matin-c-mon-thu-kin-nfr5.onrender.com
> Hébergé sur le plan gratuit de Render : le premier chargement peut prendre une trentaine de secondes (mise en veille du serveur).

---

## Fonctionnalités

### Authentification et compte
- Inscription (nom, e-mail, mot de passe avec confirmation)
- **E-mail de confirmation** avec lien à usage unique : impossible de se connecter tant que l'e-mail n'est pas confirmé
- Connexion / déconnexion (session sécurisée)
- Page de profil : modification du nom et du mot de passe

### Messagerie
- Recherche d'un utilisateur pour démarrer une conversation
- Liste des conversations
- Envoi et réception de messages en **temps réel** (sans recharger la page)
- Affichage des heures au fuseau horaire de Kinshasa

### À venir / en cours
<!-- Ajuster cette section selon l'avancement réel avant le rendu -->
- [ ] Mot de passe oublié (réinitialisation par e-mail)
- [ ] Photo de profil
- [ ] Conversations de groupe (rôles membre / admin)
- [ ] Statut des messages

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework backend | AdonisJS 7 |
| Moteur de templates | Edge |
| Base de données | PostgreSQL (Lucid ORM) |
| Temps réel | `@adonisjs/transmit` (SSE) |
| E-mails | Brevo (API) |
| Style | Tailwind CSS |
| Hébergement | Render (application + base PostgreSQL) |
| Design | Figma |

---

## Schéma de base de données

Approche « minimal modeling » : uniquement le strict nécessaire, en 5 tables.

| Table | Rôle |
|---|---|
| `users` | Comptes utilisateurs (`full_name`, `email`, `password`, `avatar_url`, `is_email_confirmed`, `last_seen_at`) |
| `tokens` | Jetons de confirmation d'e-mail / réinitialisation de mot de passe (`type`, `token_hash`, `expires_at`, `used_at`) |
| `conversations` | Conversations (privées ou de groupe) |
| `conversation_members` | Appartenance d'un utilisateur à une conversation (avec rôle membre / admin) |
| `messages` | Messages envoyés dans une conversation |

Relations :
- un utilisateur possède plusieurs tokens ;
- relation N-N entre `users` et `conversations` via le modèle `ConversationMember` ;
- une conversation contient plusieurs messages, chacun écrit par un utilisateur (`sender_id`).

📎 Le schéma DBML complet est disponible dans [`docs/schema.dbml`](docs/schema.dbml) <!-- ajouter le fichier + une capture dbdiagram -->

---

## Architecture du projet

```
app/
├── controllers/     # AuthController, ChatController, MessagesController…
├── models/          # User, Conversation, ConversationMember, Message, Token
├── validators/      # register, login…
├── middleware/      # auth, etc.
└── mails/           # e-mail de confirmation
database/
├── migrations/      # 5 migrations (users, tokens, conversations, conversation_members, messages)
└── schema.ts        # classes générées utilisées par les modèles
resources/
├── views/           # pages, layouts, composants Edge
└── js/app.js        # client temps réel (Transmit)
start/routes.ts      # routes de l'application
```

---

## Installation en local

### Prérequis
- Node.js 20+
- PostgreSQL
- Un compte Brevo (clé API) pour l'envoi des e-mails

### Étapes

```bash
# 1. Cloner le dépôt
git clone <URL_DU_DEPOT>
cd <NOM_DU_DOSSIER>

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env
# puis renseigner les variables (voir ci-dessous)

# 4. Générer la clé de l'application
node ace generate:key

# 5. Lancer les migrations
node ace migration:run

# 6. Démarrer le serveur de développement
npm run dev
```

L'application est alors disponible sur `http://localhost:3333`.

### Variables d'environnement

| Variable | Description |
|---|---|
| `APP_KEY` | Clé de l'application (`node ace generate:key`) |
| `APP_URL` | URL publique du site (utilisée dans les liens des e-mails) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` | Connexion PostgreSQL |
| `DB_SSL` | `true` en production sur Render |
| `MAIL_MAILER` | `brevo` |
| `BREVO_API_KEY` | Clé API Brevo |
| `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` | Expéditeur des e-mails |

<!-- Vérifier que les noms correspondent exactement à ton .env.example -->

---

## Déploiement

- **Application** : service web Render connecté à la branche `main`
- **Base de données** : PostgreSQL Render
- **Migrations** : lancées avec `node ace migration:run` (avec `DB_SSL=true`)
- **E-mails** : envoyés via l'API HTTP de Brevo (le SMTP est bloqué sur le plan gratuit de Render)

---

## Choix de design

- Identité **violette**, en lien avec l'univers académie / étudiants, pour se démarquer des applications de chat bleues
- Palette et contrastes pensés pour le **confort visuel** (limiter la fatigue des yeux)
- Typographies : **Bricolage Grotesque** (titres) et **Atkinson Hyperlegible** (texte, lisibilité maximale)
- Maquettes réalisées sur Figma : accueil, inscription, connexion, messagerie desktop et mobile

---

## Auteur

**Isaac Veben** : projet final, formation Kadea Academy (Développement web)
