# Português

A personal app for practising European Portuguese every day. It's a web app you can install on your phone (a PWA): no app store, no subscription, and it works offline.

The learning method behind it (spaced repetition, retrieval practice, adaptive difficulty and ear training) is explained in [PLAN.md](PLAN.md).

## Run it locally

```bash
python -m http.server 8080
```

Then open http://localhost:8080.

Run the logic tests (scheduler, answer marking, content checks, session flow):

```bash
npm test
```

## Put it on your phone (GitHub Pages, free)

1. Create a **public** repository on GitHub, for example `portugues`, and push this folder to it.
2. On GitHub, open the repository's **Settings → Pages**. Under **Build and deployment**, choose *Deploy from a branch*, select `main` and `/ (root)`, and save.
3. After a minute or so the site is live at `https://<your-username>.github.io/portugues/`.
4. On your Android phone, open that address in **Chrome**. Tap **⋮ → Add to Home screen** (or **Install app**).

### European Portuguese voice (Android)

The app uses your phone's own text-to-speech voice. To get the Portugal accent rather than the Brazilian one:

1. Open **Settings**, search for **Text-to-speech**, and go to **Speech Services by Google**.
2. Open the settings (⚙) and choose **Install voice data**.
3. Install **Português (Portugal)**.

Then pick that voice in the app's **Settings** screen.

## Speaking (optional OpenRouter key)

Speaking exercises work in either of two ways:

- **Phone's recogniser (free):** Chrome on Android uses Google's speech recognition. No key is needed.
- **OpenRouter:** add your key under **Settings → Speaking & AI**. Speech is transcribed by open-weight Whisper large-v3 (fractions of a cent per minute). With a key you also get **Pronunciation tips**, where an open-weight audio model (Voxtral Small) listens to your actual recording.

Set a credit limit on the key at openrouter.ai → Settings → Keys, just in case.

## Talk (conversation practice)

The **Talk** tab has 20 short role-plays, one per unit (neighbour, pastelaria, directions, market, pharmacy, restaurant, booking an appointment and more). The one that matches your progress is shown first.

- **AI tutor** (needs a key): say or type anything. The tutor stays in character, uses words you know, and nudges you to correct mistakes yourself. **Help me say it** gives you the Portuguese for what you want to say. **Hands-free** listens automatically and stops when you pause; the pause length is set in Settings.
- **Guided practice** (no key, works offline): scripted lines with a hint ladder.

The tutor model can be changed in Settings. The default is open-weight Voxtral Small.

## Stats and learning settings

The **Stats** tab shows your streak, words known and learning, how much you actually remembered in reviews compared with your target, a 14-day review forecast, the last 30 days of practice, progress by unit, and the words you forget most.

Under **Settings → Learning** you can set:

- **Session length:** reviews come first, and new words fill the time that's left.
- **New words per day** and **new ear-training items per day.**
- **Target recall:** the app shows what each setting costs in reviews.

## Your data

Your progress is stored only on your phone (in IndexedDB). It is never put in this repository. Use **Settings → Export backup** now and then.

Don't commit API keys to this repository: it's public. The app keeps your OpenRouter key on the phone only and leaves it out of backups.

## Structure

| Path | What it is |
|---|---|
| `index.html`, `css/style.css` | App shell and styles |
| `js/app.js` | Screens: home, session, units, settings |
| `js/stats.js` | Stats calculations and the Stats screen |
| `js/talk.js`, `js/tutor.js`, `js/scenarios.js` | Talk tab: AI tutor, guided practice, role-plays |
| `js/speech.js`, `js/recorder.js`, `js/pronounce.js`, `js/openrouter.js` | Voice output, recording, speech marking, OpenRouter calls |
| `js/session.js` | Daily queue, session length, adaptive difficulty, re-asking missed items |
| `js/fsrs.js` | FSRS-4.5 spaced-repetition scheduler |
| `js/grade.js` | Forgiving answer marking (accents, typos, articles) |
| `js/exercises.js` | Exercise screens |
| `js/content.js`, `js/content-a1.js`, `js/content-a2.js` | Units 1–20 and ear-training items |
| `js/store.js` | IndexedDB storage, backup and restore |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline support and installability |
