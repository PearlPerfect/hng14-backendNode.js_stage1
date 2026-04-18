# Profiles API

A REST API that accepts a name, enriches it with data from three external APIs (Genderize, Agify, Nationalize), classifies the result, stores it in a SQLite database, and exposes endpoints to manage that data.

Built with **Node.js**, **Express**, **SQLite (better-sqlite3)**, and **UUID v7**.

---

## Live Demo

- **API Base URL:** `https://your-app.vercel.app`
- **Interactive Docs:** `https://your-app.vercel.app` _(visit the root URL in a browser)_

> Replace the URL above with your actual deployed URL after deployment.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js | Assignment requirement |
| Framework | Express | Minimal, flexible |
| Database | SQLite via `better-sqlite3` | Zero config, file-based, synchronous |
| ID generation | `uuid` (v7) | Time-sortable UUIDs as required |
| HTTP client | `axios` | Clean API for calling external services |
| CORS | `cors` | Adds `Access-Control-Allow-Origin: *` |

---

## Project Structure

```
profiles-api/
├── public/
│   └── index.html              ← Interactive API docs (served at /)
├── src/
│   ├── config/
│   │   └── db.js               ← SQLite setup & schema
│   ├── controllers/
│   │   └── profile.controller.js  ← HTTP in/out, no business logic
│   ├── services/
│   │   ├── external.service.js ← Calls Genderize, Agify, Nationalize
│   │   └── profile.service.js  ← Core logic, DB queries
│   ├── routes/
│   │   └── profile.routes.js   ← Maps URLs to controllers
│   ├── middleware/
│   │   └── errorHandler.js     ← Global error formatting
│   ├── utils/
│   │   └── classify.js         ← Age group + top country helpers
│   ├── app.js                  ← Express app setup
│   └── server.js               ← Entry point (starts the server)
├── .env
├── .gitignore
├── package.json
├── vercel.json                 ← Vercel deployment config
└── README.md
```

---

## Getting Started (Local)

### Prerequisites
- Node.js v18 or higher
- npm

### 1. Clone the repo

```bash
git clone https://github.com/your-username/profiles-api.git
cd profiles-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the `.env` file

```bash
cp .env.example .env
```

Or create it manually:

```
PORT=3000
```

### 4. Start the development server

```bash
npm run dev
```

The server starts at `http://localhost:3000`.  
Visit `http://localhost:3000` in your browser to open the interactive API docs.

### 5. Start in production mode

```bash
npm start
```

---

## API Reference

All responses follow this envelope:

```json
{ "status": "success", "data": { ... } }
{ "status": "error", "message": "..." }
```

All timestamps are **UTC ISO 8601**. All IDs are **UUID v7**.

---

### POST `/api/profiles`

Creates a new profile by calling all three external APIs in parallel.

**Request body:**
```json
{ "name": "ella" }
```

**Success — new profile (201):**
```json
{
  "status": "success",
  "data": {
    "id": "b3f9c1e2-7d4a-4c91-9c2a-1f0a8e5b6d12",
    "name": "ella",
    "gender": "female",
    "gender_probability": 0.99,
    "sample_size": 1234,
    "age": 46,
    "age_group": "adult",
    "country_id": "DK",
    "country_probability": 0.85,
    "created_at": "2026-04-01T12:00:00.000Z"
  }
}
```

**Success — already exists (200):**
```json
{
  "status": "success",
  "message": "Profile already exists",
  "data": { "...existing profile..." }
}
```

**Errors:**

| Status | Condition |
|---|---|
| 400 | `name` is missing or empty |
| 422 | `name` is not a string |
| 502 | Any external API returned null / invalid data |

---

### GET `/api/profiles`

Returns all profiles. Supports optional query filters.

**Query parameters (all optional, case-insensitive):**

| Parameter | Example |
|---|---|
| `gender` | `?gender=male` |
| `country_id` | `?country_id=NG` |
| `age_group` | `?age_group=adult` |

Filters can be combined: `/api/profiles?gender=male&country_id=NG`

**Success (200):**
```json
{
  "status": "success",
  "count": 2,
  "data": [
    {
      "id": "...",
      "name": "emmanuel",
      "gender": "male",
      "age": 25,
      "age_group": "adult",
      "country_id": "NG"
    }
  ]
}
```

---

### GET `/api/profiles/:id`

Returns a single profile by UUID.

**Success (200):** full profile object (same shape as POST response)

**Errors:**

| Status | Condition |
|---|---|
| 404 | No profile found with the given id |

---

### DELETE `/api/profiles/:id`

Deletes a profile by UUID.

**Success:** `204 No Content` (empty body)

**Errors:**

| Status | Condition |
|---|---|
| 404 | No profile found with the given id |

---

## Classification Rules

### Age group (from Agify `age` field)

| Range | Group |
|---|---|
| 0 – 12 | `child` |
| 13 – 19 | `teenager` |
| 20 – 59 | `adult` |
| 60+ | `senior` |

### Nationality (from Nationalize `country` array)

The entry with the highest `probability` value is selected as `country_id`.

---

## External API Edge Cases

If any of the three external APIs returns invalid data, the server responds with **502 Bad Gateway** and does **not** store the profile:

| API | Invalid condition |
|---|---|
| Genderize | `gender: null` or `count: 0` |
| Agify | `age: null` |
| Nationalize | empty `country` array |

**502 response format:**
```json
{ "status": "error", "message": "Genderize returned an invalid response" }
```

---

## Deploying to Vercel

See the full step-by-step guide in the [Vercel Deployment](#vercel-deployment) section below.

Short version:
1. Add `vercel.json` to the project root (included in this repo)
2. Push to GitHub
3. Import the repo on vercel.com
4. Deploy — your API URL is live instantly

> **Note on SQLite + Vercel:** Vercel runs serverless functions with a read-only filesystem. The SQLite `.db` file is bundled at build time and is readable, but **writes will not persist across requests** in production. For a real production deployment with persistent storage, swap `better-sqlite3` for a managed database like **Neon (PostgreSQL)**, **PlanetScale (MySQL)**, or use Vercel's own **Vercel Postgres** or **KV** offerings. For this assessment, Railway or Heroku are better choices since they give you a persistent filesystem.

---

## Vercel Deployment

### Step 1 — Add `vercel.json` to the project root

```json
{
  "version": 2,
  "builds": [
    { "src": "src/server.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "src/server.js" }
  ]
}
```

### Step 2 — Update `src/app.js` to serve the docs page

Make sure Express serves the `public/` folder at the root:

```js
const path = require('path');

// Add this line before your routes
app.use(express.static(path.join(__dirname, '../public')));
```

### Step 3 — Update `.gitignore`

```
node_modules/
profiles.db
.env
```

Make sure `profiles.db` is **not** committed. The file will be created fresh on the server.

### Step 4 — Push to GitHub

```bash
git init               # if not already a git repo
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/your-username/profiles-api.git
git push -u origin main
```

### Step 5 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (use your GitHub account)
2. Click **Add New → Project**
3. Find and import your `profiles-api` repo
4. In the **Configure Project** screen:
   - Framework Preset: **Other**
   - Root Directory: leave as `/`
   - Build Command: leave blank
   - Output Directory: leave blank
5. Click **Deploy**

Vercel will detect `vercel.json` and deploy your Express app as a serverless function.

### Step 6 — Set environment variables on Vercel

1. In your Vercel project dashboard, go to **Settings → Environment Variables**
2. Add: `NODE_ENV` = `production`
3. Redeploy if needed (Vercel → Deployments → click the three dots → Redeploy)

### Step 7 — Get your URL

After deployment, Vercel gives you a URL like `https://profiles-api-xyz.vercel.app`.

Visit it in a browser — you'll see the interactive API docs with the base URL pre-set to production.

### Step 8 — Update the docs page production URL

Open `public/index.html` and find this line:

```js
const PROD_URL = ''; // Set your production URL here if desired
```

Replace it with:

```js
const PROD_URL = 'https://profiles-api-xyz.vercel.app';
```

Commit and push — Vercel redeploys automatically.

---

## Running Tests (manual)

Use the interactive docs at `http://localhost:3000` or run these curl commands:

```bash
# Create a profile
curl -X POST http://localhost:3000/api/profiles \
  -H "Content-Type: application/json" \
  -d '{"name": "ella"}'

# Send same name again (should return 200 + "already exists")
curl -X POST http://localhost:3000/api/profiles \
  -H "Content-Type: application/json" \
  -d '{"name": "ella"}'

# Get all profiles
curl http://localhost:3000/api/profiles

# Filter by gender and country
curl "http://localhost:3000/api/profiles?gender=female&country_id=DK"

# Get one profile (replace ID)
curl http://localhost:3000/api/profiles/YOUR_ID_HERE

# Delete a profile
curl -X DELETE http://localhost:3000/api/profiles/YOUR_ID_HERE

# Test 400 — missing name
curl -X POST http://localhost:3000/api/profiles \
  -H "Content-Type: application/json" \
  -d '{}'

# Test 404 — nonexistent id
curl http://localhost:3000/api/profiles/nonexistent-id
```

---

## License

MIT