# Daily (Português)

A personal app for practising European Portuguese every day. It's a web app you can install on your phone (a PWA): no app store, no subscription, and it works offline. On the phone it shows up as **Daily**, with a plain tick icon.

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

## Extras (on the home screen)

- **✍️ Add a word:** type something you wanted to say, or share text to **Daily** from any app. With a key it's translated into European Portuguese. Your own words come first in your next session.
- **📖 Novela:** a daily soap-opera episode written from words you know plus 2–3 new ones. Tap any word for its meaning. It unlocks at 40 words and needs a key.
- **🎧 Walk:** a hands-free earphone drill. You hear the English, say it, then hear the Portuguese twice.
- **🎮 Games:** Blitz, Ear rush and Números (numbers, prices and phone numbers by ear).
- **💍 Reveal Day:** a countdown and pace planner, the *Para ela* pack, your message in Portuguese with rehearsal, and two personalised role-plays.

## Pocket quizzes (notifications)

Three times a day, a GitHub Action sends an empty push to your phone. The phone then shows a quiz: you see the word, tap **Show answer**, then tap **✓** or **✗**. That counts as a review. The push carries no content, because the phone picks the word itself.

One-time setup:

1. In the app: **Settings → Pocket quizzes → Turn on for this device**, then copy the setup code.
2. On GitHub: **Settings → Secrets and variables → Actions → New repository secret**:
   - `PUSH_SUBSCRIPTIONS`: the setup code. For more than one device, put each code on its own line.
   - `VAPID_PRIVATE_KEY`: the private push key. It was generated locally into `.secrets/`, which git ignores. Never commit it.
3. Test it under **Actions → Pocket quiz → Run workflow**.

Times are set in `.github/workflows/pocket-quiz.yml`: around 08:00, 12:00 and 17:30 UTC, plus a random delay of up to 90 minutes. If the repo has had no activity for 45 days, the workflow makes an empty commit, because GitHub pauses scheduled workflows after 60 quiet days.

## Sync between phone and tablet

Under **Settings → Sync between devices**, paste a GitHub token on each device. The first device creates a **secret gist** called "Daily sync" on your account. Other devices find it by themselves and merge into it.

- **Merging:**
  - For each word, the most recent review wins.
  - Day counters take the larger of the two devices' figures.
  - Your own words, Novela episodes and best scores are combined.
  - Settings use the most recent change. A device joining for the first time takes the synced settings.
- **When it syncs:** when you open the app, after each session, when you leave the app, or with **Sync now**.
- **Never synced:** your OpenRouter key, your GitHub token and your voice choice.
- **Privacy:** secret gists don't appear on your profile or in search, but they aren't encrypted. Anyone with the exact link could read yours.

To make the token: go to github.com → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate. Give it only the **Gists: Read and write** permission.

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
| `js/content-her.js` | The *Para ela* (Reveal Day) pack |
| `js/extras.js` | Reveal Day and quick capture screens |
| `js/novela.js`, `js/walk.js`, `js/games.js`, `js/numbers.js` | Novela, Walk mode, games, numbers in words |
| `js/pocket.js`, `scripts/push.mjs`, `.github/workflows/pocket-quiz.yml` | Pocket quizzes: device side, push sender, schedule |
| `js/store.js` | IndexedDB storage, backup and restore |
| `js/sync.js` | Sync between devices through a secret GitHub Gist |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline support and installability |
