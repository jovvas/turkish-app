# Türkçe — Turkish Study App

A personal, installable web app (PWA) for learning Turkish on your iPhone.

- **Module 1 — Reader:** open your PDF coursebooks, page through them, and annotate with **highlighter / pen / text / eraser**. Every mark is saved per page to your account, so your notes follow you across devices.
- **Module 2 — Dictionary:** a personal word list you build over time (Turkish, meaning, example, notes, source page). Add words straight from the reader with the **"+ Word"** button. Search, filter, and mark words as learned.
- **Module 3 — Grammar:** a personal grammar reference you grow as you study. Each topic has a title, an explanation in your own words, a list of example sentences (Turkish + meaning), and the source book/page. Tap a topic to expand it; search across titles, notes, and examples. You can also save a topic straight from the reader with the **📝** button — it pre-fills the current book and page.
- **Module 4 — Tutor (AI chat):** a conversational Turkish assistant. Ask grammar and vocabulary questions, practice a simple conversation, get sentences translated and broken down word-by-word, or ask to be quizzed. It explains in English by default but follows you into Serbian or Turkish. The conversation keeps going across opening/closing the panel and switching tabs on your device (stored locally, not synced) until you tap **New chat** to reset it. Right inside the chat, the **📖** and **📝** buttons let you search or add a word or grammar topic without leaving the conversation. You can also open the Tutor straight from the reader with the **💬** button — it slides up over the book so you never lose your place.

Stack: **Next.js** (on Vercel) + **Supabase** (auth, database, file storage) + **Claude** (the AI tutor and the dictionary's "Fill with AI").

---

## What you'll need (free tiers are fine)

- A **GitHub** account
- A **Supabase** account — https://supabase.com
- A **Vercel** account — https://vercel.com
- **Node.js 18+** installed locally (only needed once, to upload the books)

The AI features (Module 4 Tutor + the dictionary's "Fill with AI") use your own **Claude API key**. Add `ANTHROPIC_API_KEY` in `.env.local` for local dev and in **Vercel → Project → Settings → Environment Variables** for the live app. Get a key at https://console.anthropic.com → API Keys. The Reader, Dictionary, and Grammar modules work fine without it.

---

## Step 1 — Create the Supabase project

1. In Supabase, click **New project**. Pick a name and a strong database password.
2. When it's ready, open **SQL Editor → New query**, paste the entire contents of `supabase/schema.sql`, and click **Run**. This creates the `books`, `annotations`, `dictionary`, and `grammar` tables with the right security rules.
   - **Already have the database from v1/v2?** Don't re-run `schema.sql`. Instead run `supabase/v3-grammar.sql` once — it only adds the new `grammar` table and leaves everything else untouched.
3. Go to **Storage → New bucket**. Name it exactly **`books`** and turn **Public bucket ON**. (The coursebooks aren't sensitive; your notes & dictionary stay private regardless.)
4. Go to **Project Settings → API** and copy these two values for later:
   - **Project URL** # https://mqfojvawbffkowsoltii.supabase.co
   - **anon public** key # eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZm9qdmF3YmZma293c29sdGlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MzY2NzcsImV4cCI6MjA5NzExMjY3N30.FOFFA284OJY4IF8trzSB7343cFn88aetqkP8yslWd5g

---

## Step 2 — Configure the project locally

1. Open a terminal in this folder and install dependencies:
   ```bash
   npm install
   ```
2. Copy the example env file and fill it in:
   ```bash
   cp .env.local.example .env.local
   ```
   Open `.env.local` and paste your values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...        # Project URL from Step 1.4
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # anon public key from Step 1.4
   SUPABASE_SERVICE_ROLE_KEY=...       # Project Settings → API → service_role (secret)
   ```
   > The `service_role` key is only used locally to upload the books. Never commit it and never put it in Vercel.

---

## Step 3 — Upload your coursebooks

Your two PDFs (`ISTANBUL_A1_DERS_KITABI_104S.pdf` and `TeachYourselfTurkish.pdf`) are already in this folder. Upload them to Supabase Storage and register them:

```bash
npm run upload-books
```

You should see "Registered …" for each book. (You can re-run this anytime, and it will also pick up any new PDF you drop into a `source-pdfs/` folder.)

---

## Step 4 — Try it locally (optional but recommended)

```bash
npm run dev
```

Open http://localhost:3000, sign in with your email (a magic link is sent), and check that the books open and annotations save.

> For local magic links to work, in Supabase go to **Authentication → URL Configuration** and add `http://localhost:3000/auth/callback` to **Redirect URLs**.

---

## Step 5 — Push to GitHub

```bash
git init
git add .
git commit -m "Türkçe study app"
git branch -M main
git remote add origin https://github.com/<your-username>/turkish-app.git
git push -u origin main
```

The PDFs are intentionally **not** committed (they live in Supabase Storage). This keeps the repo small.

---

## Step 6 — Deploy to Vercel

1. In Vercel, click **Add New → Project** and import your GitHub repo.
2. Under **Environment Variables**, add **only** these two:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   (Do **not** add the service_role key.)
3. Click **Deploy**. You'll get a URL like `https://turkish-app.vercel.app`.
4. Back in Supabase → **Authentication → URL Configuration**:
   - Set **Site URL** to your Vercel URL.
   - Add `https://<your-app>.vercel.app/auth/callback` to **Redirect URLs**.

---

## Step 7 — Install on your iPhone

1. Open your Vercel URL in **Safari** on the iPhone.
2. Tap the **Share** button → **Add to Home Screen**.
3. Launch it from the new icon — it opens full-screen, like a native app.
4. Sign in with your email once; it stays signed in.

---

## Using the app

- **Library** (bottom-left tab): tap a book to open it.
- **Reader:**
  - The bottom toolbar has ✋ pan, ✏️ pen, 🖍️ highlighter, 🔤 text, 🧽 eraser, a colour row, **Clear** (this page), and **+ Word**.
  - Use ✋ to scroll/zoom the page; switch to a drawing tool to annotate.
  - The page arrows and −/+ at the bottom change page and zoom.
  - Annotations auto-save (you'll see a brief "Saving… / Saved ✓").
- **Dictionary** (bottom-right tab): search, filter All / Learning / Learned, tap the circle to mark a word learned, 🗑 to delete.

## Adding more books later

Drop any PDF into a `source-pdfs/` folder in this project and run `npm run upload-books` again. It will appear in your Library automatically.

## Troubleshooting

- **"No books yet" in the Library** → run `npm run upload-books`, then refresh.
- **Magic link doesn't sign you in** → make sure the deployed URL and `/auth/callback` are in Supabase → Authentication → URL Configuration.
- **A book won't open** → confirm the `books` storage bucket is **Public**.
- **Annotations not saving** → confirm `schema.sql` ran without errors (the `annotations` table and its policies must exist).
