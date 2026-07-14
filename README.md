# Hellcastle Rating (HR)

Track HR (Hellcastle Rating) over all games played, similar to an Elo system.

## Tech Stack

- **Frontend**: Single-page HTML + JavaScript (`index.html`)
- **Backend**: Vercel Serverless Function (`api/matches.js`)
- **Storage**: Backblaze B2 (remote) with `localStorage` fallback

---

## Vercel Deployment

### Prerequisites

- A [Vercel](https://vercel.com) account
- A [Backblaze B2](https://www.backblaze.com/b2/cloud-storage.html) account with a bucket created

### Steps

1. **Fork / push this repo** to your GitHub account.
2. **Import the project** into Vercel from the dashboard.
3. **Set environment variables** in Vercel project settings (see below).
4. **Deploy** — Vercel automatically serves `index.html` as the root and
   `api/matches.js` as the `/api/matches` serverless endpoint.

---

## Required Environment Variables

| Variable        | Description                                         |
|-----------------|-----------------------------------------------------|
| `B2_KEY_ID`     | Backblaze B2 application key ID                     |
| `B2_APP_KEY`    | Backblaze B2 application key (secret)               |
| `B2_BUCKET_ID`  | ID of the B2 bucket used to store match data        |
| `B2_FILE_NAME`  | *(optional)* File name in the bucket — default: `matches.json` |

Set these in **Vercel → Project → Settings → Environment Variables** (all
environments: Production, Preview, Development).

---

## Backblaze B2 Setup

1. Log in to <https://secure.backblaze.com> and navigate to **B2 Cloud Storage**.
2. Create a **bucket** (private, no public access needed).
3. Copy the **Bucket ID** from the bucket details page → set as `B2_BUCKET_ID`.
4. Go to **App Keys** and create a new application key scoped to that bucket
   with **Read and Write** permissions.
5. Copy the **keyID** and **applicationKey** shown at creation time (the key
   is only shown once) → set as `B2_KEY_ID` and `B2_APP_KEY`.

---

## Local Development

```bash
npm install
npx vercel dev
```

`vercel dev` starts a local server that mirrors the Vercel deployment:
`index.html` is served at `http://localhost:3000/` and the serverless function
is available at `http://localhost:3000/api/matches`.

You can also set environment variables in a local `.env` file (Vercel CLI picks
this up automatically):

```
B2_KEY_ID=your_key_id
B2_APP_KEY=your_app_key
B2_BUCKET_ID=your_bucket_id
B2_FILE_NAME=matches.json   # optional
```

---

## Verifying Save / Load of Online Match Data

### Manual test steps

1. Open the deployed app (or `http://localhost:3000` with `vercel dev`).
2. Add two or more players, enter a match, and click **Save Match & Update HR**.
3. The footer status bar should show **"Saved locally + synced to online storage."**
4. Open the app in a new private/incognito window (no localStorage).
5. The app should load with the same players, matches, and HR values — confirming
   a successful read from Backblaze B2.

### API smoke test (curl)

```bash
# GET — read current state
curl https://<your-vercel-domain>/api/matches

# POST — write state
curl -X POST https://<your-vercel-domain>/api/matches \
  -H 'Content-Type: application/json' \
  -d '{"players":{},"matches":[]}'
```

Both requests should return JSON without an `error` field.

---

## Offline / Fallback Behavior

If the B2 credentials are missing or the network is unreachable, the app falls
back silently to `localStorage`. The footer status bar indicates the current
storage mode.
