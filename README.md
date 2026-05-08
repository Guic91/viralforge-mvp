# ViralForge

AI video viral content generator for influencers and marketing teams.

## Project Structure

```
viralforge/
├── apps/
│   ├── web/
│   │   └── index.html          # Single-page web app (Firebase 9 SDK, Tailwind CDN)
│   ├── api/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js         # Fastify API server (port 3001)
│   │       └── firebase.js      # Firebase Admin SDK init
│   └── worker/
│       ├── package.json
│       └── src/
│           └── index.js         # Firestore polling worker (optional, for robustness)
├── package.json                 # Root workspace
└── README.md
```

## Deployment

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com) → project `photo-beemm`
2. Enable **Firestore** (native mode, multi-region)
3. Enable **Storage** (bucket: `photo-beemm.firebasestorage.app`)
4. Create collection: `viral_jobs` (schema below)

### `viral_jobs` Firestore Collection Schema

Each document:
```json
{
  "jobId": "hook_abc123",
  "jobType": "hooks",
  "status": "pending",
  "inputData": {
    "prompt": "...",
    "imageUrl": "...",
    "apiKey": "sk-runway-...",
    "userId": "user_xxx"
  },
  "outputUrl": null,
  "error": null,
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

**Indexes required** (create in Firestore console):
- Collection: `viral_jobs` → fields: `status` (Asc), `createdAt` (Asc)

### API Server Deployment

```yaml
# Coolify service config for API
name: viralforge-api
workdir: /repos/viralforge/apps/api
dockerfile: |
  FROM node:20-alpine
  WORKDIR /app
  COPY package*.json ./
  RUN npm install
  COPY . .
  CMD ["node", "src/index.js"]
port: 3001
env:
  FIREBASE_PROJECT_ID: photo-beemm
  FIREBASE_STORAGE_BUCKET: photo-beemm.firebasestorage.app
  # Optional master key fallback:
  # RUNWAYML_API_SECRET: your_master_runway_key
```

### Firestore Security Rules (hackathon — open for prototyping)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /viral_jobs/{jobId} {
      allow read, write: if true;
    }
  }
}
```

### Storage Rules

```
rules_version = '2';
service firebase.storage {
  match /b/photo-beemm.firebasestorage.app {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/credits?apiKey=xxx` | Get Runway credit balance (proxy) |
| POST | `/api/generate/hooks` | Create hook generation jobs |
| POST | `/api/generate/ab-test` | Create A/B variant jobs |
| POST | `/api/generate/product-video` | Create product video job |
| POST | `/api/generate/voiceover` | Create voiceover job |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | API server port |
| `FIREBASE_PROJECT_ID` | photo-beemm | Firebase project ID |
| `FIREBASE_STORAGE_BUCKET` | photo-beemm.firebasestorage.app | Firebase storage bucket |
| `RUNWAYML_API_SECRET` | — | Master Runway API key (optional fallback) |

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Browser: apps/web/index.html                             │
│  ┌────────────────┐  ┌──────────────────┐              │
│  │ Firebase 9 SDK │  │ localStorage      │              │
│  │ (Firestore     │  │ (VIRALFORGE_API_  │              │
│  │  real-time)    │  │  KEY stored here) │              │
│  └───────┬────────┘  └──────────────────┘              │
│          │ poll Firestore job docs                       │
├──────────┼──────────────────────────────────────────────┤
│          ▼                                               │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ apps/api/src/index.js (Fastify, port 3001)            │ │
│  │                                                     │ │
│  │  POST /api/generate/hooks                            │ │
│  │    → writes 'pending' doc to Firestore              │ │
│  │    → spawns async background task                   │ │
│  │      → Runway SDK (server-side, API key hidden)     │ │
│  │      → uploads to Firebase Storage                  │ │
│  │      → updates Firestore doc to 'completed'        │ │
│  │    → returns { jobIds: [...] } immediately         │ │
│  │                                                     │ │
│  │  GET /api/credits?apiKey=xxx                         │ │
│  │    → proxies to Runway org API (CORS workaround)   │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

## Runway API Key Handling

- User enters their Runway API key in the web UI
- Stored in `localStorage.VIRALFORGE_API_KEY` (client-side only, never sent to storage)
- Sent with each job creation request to the API
- API stores it briefly in Firestore `inputData.apiKey` for the worker to use
- Never persisted after job completes
- Never stored server-side beyond the job's processing window
