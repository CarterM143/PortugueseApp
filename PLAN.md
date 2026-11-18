# European Portuguese app: research-based plan

A personal app for learning European Portuguese (pt-PT) from beginner level. It installs on your phone from GitHub Pages and works offline. It has an optional AI tutor that runs on your own OpenRouter key.

---

## 1. What the research says, and how the app uses it

| Finding | Evidence | What the app does |
|---|---|---|
| **Testing yourself beats rereading** | Dunlosky et al. (2013) reviewed 10 techniques and rated only *practice testing* and *distributed practice* as "high utility". Roediger & Karpicke (2006) found the same testing effect. | Nearly every screen asks you to **produce or recall** something. You almost never just read. Every answer gets immediate corrective feedback. |
| **Spacing beats cramming** | Distributed practice was the other high-utility technique (Dunlosky 2013). Cepeda et al. (2006, 2008) showed that the best gap between reviews grows with how long you want to remember something. | Every word, phrase, sound and grammar point is scheduled with **FSRS**, the modern open-source spaced-repetition algorithm now used by Anki. Its recall predictions are more accurate than the older SM-2 algorithm. The default retention target is 90% and can be changed. |
| **The best learning happens at about 85% success** | Wilson et al. (2019, *Nature Communications*) found that a training error rate of about 15% maximises learning speed in their models. | An **adaptive difficulty controller** tracks your rolling accuracy. Above about 90% it makes exercises harder, for example switching from multiple choice to typing to speaking. Below about 75% it makes them easier. |
| **Interleaving helps, but not for everything** | Brunmair & Richter's (2019) meta-analysis found a moderate overall benefit (g = 0.42). It was largest for telling similar categories apart. It warned *against* interleaving when first learning words. | New vocabulary is introduced **in themed blocks**. Reviews, and contrasts such as *ser/estar*, *por/para* and *tu/você*, are **interleaved**. |
| **Generating an answer before seeing it improves memory** | The generation effect (Slamecka & Graf 1978) and the pretesting effect (Kornell et al. 2009): a wrong guess followed by feedback still improves retention. | A new item is often shown first as a **"guess first"** question, for example "What do you think *pequeno-almoço* means?", before it is taught. |
| **High-frequency words give the most coverage early** | Nation (2006): about 95% word coverage is the minimum for understanding speech, and 98% is comfortable. The first 1,000–2,000 word families cover the bulk of everyday speech. | The vocabulary order is **frequency-first**, adjusted for usefulness to a beginner. Words come as **chunks**, such as *Pode repetir?* or *Queria um café*, not as isolated words. |
| **Learners need input, output and interaction** | Comprehensible input (Krashen), the output hypothesis (Swain) and the interaction hypothesis (Long). Mackey & Goo (2007) meta-analysed interaction studies and found a clear benefit. | Every unit includes **listening input** pitched just above your level, **forced output** in writing and speech, and **interaction** with the AI tutor in role-plays. |
| **The type of correction matters** | Lyster & Saito (2010): *prompts*, which push you to fix the error yourself, had larger effects than *recasts*, which simply give the right form. Explicit feedback helps beginners. | The tutor uses a **prompt-first ladder**: (1) give a hint and let you retry, (2) give a more explicit hint, (3) show the correct form with a one-line reason. It never piles on corrections, at most one or two per turn. |
| **Perception training with many voices improves hearing and speaking** | Meta-analyses of high variability phonetic training (HVPT): Uchihara, Karas & Thomson (2024, 2025). Training with many talkers and many words reliably improves perception, and the gains carry over moderately to speaking. | A **sound-discrimination track** uses European Portuguese minimal pairs, played in as many different voices as are available, with right/wrong feedback. |
| **European Portuguese is hard to hear** | European Portuguese reduces or drops unstressed vowels heavily (*pequeno* sounds like "p'queno"). Stress training transfers better than vowel training. | Listening work starts on **day 1**. Stress is marked in the early stages. Dictation and slowed-down playback are used for practice, then normal speed as you get better. |
| **Short daily sessions beat occasional long ones** | Spacing research, plus sleep consolidation of newly learned material. | The daily session is **20–25 minutes** by default. New items are capped at about **8–12 a day** so the review load stays manageable. There is no penalty for a short day. |

**Vivid imagery and keyword mnemonics** (for example, picturing *pequeno-almoço* as a "small, almost-lunch") got a low rating in Dunlosky et al. The images form quickly but tend to fade faster than memories built through spaced retrieval, and they take effort for every item. So they're **optional and targeted**. Once an item has been forgotten two or more times, the app offers a **memory hook**: you write your own vivid image, which works best, and it's shown each time that item comes up. A later phase can let the AI suggest one.

**Low-value techniques are left out:** rereading, highlighting and passive "flip through the deck" modes. Each of these got a low rating in Dunlosky et al.

**Rough timeline:** the US Foreign Service Institute puts Portuguese among the easiest languages for English speakers, at roughly 600–750 classroom hours to professional level. At 20–30 focused minutes a day, a realistic goal is solid **A1 in about 3 months** and **A2 in about 6–8 months**.

---

## 2. Structure of the daily session (about 20–25 min)

1. **Reviews due** (about 8 min). These are FSRS-scheduled items, mixed across modalities and interleaved.
2. **Ear training** (about 3 min). Minimal pairs and stress spotting from the pronunciation track.
3. **New material** (about 6 min). 8–12 chunks for the current unit. Each one goes through guess-first, then context sentence and audio, then immediate recall, then recall again later in the same session.
4. **Grammar micro-lesson** (about 3 min, only when the unit has one). One rule with a contrast example, then 4–6 exercises where you produce the form.
5. **Use it** (about 5 min). A short role-play with the AI tutor, such as ordering at a café, using today's material. It falls back to scripted dialogues when you're offline or have no API key.
6. **Wrap-up.** Accuracy, streak, items learned, and a short preview of tomorrow.

Each part can be skipped, and you can do extra review-only sessions.

## 3. Exercise ladder (the same item at increasing difficulty)

Each item has a **skill level for each modality**. The difficulty controller picks the hardest rung where you're likely to hit about 85%.

| Rung | Receptive | Productive |
|---|---|---|
| 1 | Hear the Portuguese and pick the meaning (multiple choice) | – |
| 2 | Read the Portuguese and pick the meaning | Pick the right Portuguese for the English |
| 3 | – | Build the sentence from **word tiles** |
| 4 | **Dictation**: hear it and type it | **Cloze**: type the missing word |
| 5 | – | Type the full translation |
| 6 | – | **Read aloud**, with pronunciation feedback |
| 7 | – | **Say the translation** from an English prompt |
| 8 | Understand a free reply from the tutor | Free conversation with the tutor |

## 4. Help for slow, error-prone typing or speaking

**Typing**
- An accent bar with **ã õ ç á à â é ê í ó ô ú** is always one tap away.
- **Forgiving marking**:
  - A missing accent counts as *correct*, with a note: "watch the accent: *está*".
  - A typo one or two letters off counts as *almost*: it gets partial credit and the error is highlighted.
  - A wrong word counts as *wrong*.
  The grade feeds FSRS as Good, Hard or Again.
- **No timers, ever.** Speed is never scored.
- If a typing exercise fails twice, it **steps down** to tiles or multiple choice instead of failing you.
- A **tiles-only mode** lets you do a whole session without typing.

**Speaking**
- **Push-to-talk with no auto-cutoff.** You decide when you're done, so long pauses are fine.
- **"Here's what I heard"**: the app always shows the transcript, so you can see where it went wrong.
- **Lenient matching in tiers**:
  - *understood*: the meaning got across, even with an accent.
  - *close*: one or two sounds off; the app plays the target slowly and lets you try again.
  - *unclear*: the app offers to switch to typing or tiles for that item, with no penalty.
- **Phonetic matching**: the transcript is compared with the target after normalising sounds that are often confused, such as final *-s*/*-sh* and the nasal vowels. A plain string diff would mark too many attempts wrong.
- **Recurring errors become drills**: if you keep missing *ão*, for example, the app adds that minimal-pair set to the ear-training track.
- **Slow playback** at 0.6× or 0.8×, plus **shadowing**: listen, then repeat.
- **Hands-free mode**: the app reads the prompt and listens for your answer, for practice while walking.

**AI tutor**
- The tutor is told you're a beginner. It answers in **simple Portuguese with optional English**, waits patiently, and **works out what you meant** from broken input instead of judging it word for word.
- A **"Help me say it"** button: you type or say it in English and the tutor gives you the Portuguese to repeat.
- It uses the prompt-first correction ladder from section 1, with at most one or two corrections per turn.

## 5. AI and voice: OpenRouter (your key, open-weight models where possible)

| Job | Default | Notes |
|---|---|---|
| Tutor chat, explanations, extra sentences | An open-weight chat model you choose, for example a Qwen, Llama, Gemma or DeepSeek model | The model ID is a setting, so you can swap it any time. The prompt forces **European** Portuguese (*tu*/*você*, *estar a* + infinitive, *autocarro* not *ônibus*). |
| Speech to text | `openai/whisper-large-v3` (open-weight) through `/api/v1/audio/transcriptions` with `language: "pt"` | About **$0.0005 per minute** of speech (listed at $0.000008/s), so a whole month of daily speaking costs well under $1. The endpoint accepts webm and m4a, which matches what phone browsers record. |
| Text to speech | **The phone's own pt-PT voices** (free, offline) | iOS and Android both ship European Portuguese voices. The open-weight TTS option on OpenRouter (Kokoro) lists only "Portuguese", which is likely Brazilian, so it would teach the wrong accent. Paid pt-PT cloud voices can be an option later. |

- Your API key is **stored only on your phone**, never in the repo, which matters because the repo is public. Set a spending limit on the key in OpenRouter as a safety net.
- Without a key, everything works except the free-form tutor and speech grading. Scripted dialogues and self-graded read-aloud take their place.
- **Speech-to-text caveat:** Whisper tends to "auto-correct" toward real words, so it can hear what you *meant* rather than what you *said*. That suits a forgiving tutor but makes pronunciation scoring approximate. Section 4 explains how the app compensates.

## 6. Curriculum (European Portuguese, A1 to A2)

Content is written for **Portugal**: *tu* for friends and *você* or *o senhor/a senhora* for polite address, *estar a fazer*, pronouns after the verb in statements (*Chamo-me…*), and Portugal-specific vocabulary such as *pequeno-almoço*, *autocarro*, *comboio*, *telemóvel* and *casa de banho*.

- **Units 1–10 (A1 core):** greetings and politeness, introducing yourself, numbers and prices, café and *pastelaria* (*uma bica*, *um galão*), family, days and time, *ser* vs *estar*, present tense regular verbs, getting around (directions, *autocarro*, *metro*, *comboio*), shopping and food.
- **Units 11–20 (A1+ to A2):** *estar a* + infinitive, *ter*/*ir*/*fazer*, likes (*gostar de*), the past tense (*pretérito perfeito*), the near future (*vou* + infinitive), health, home, plans, weather, phone calls and appointments.
- **Pronunciation track (runs alongside):** vowel reduction, nasal vowels (*ão*, *ãe*, *õe*, *em*), the *sh* sound of syllable-final *s*, *lh*/*nh*, the two *r* sounds, and stress patterns.
- **Size:** about 40–60 items per unit. I write the base content and check it for European Portuguese usage. The AI can generate extra example sentences on demand and cache them on the phone.

## 7. Technical design

- A **static PWA** with plain HTML, CSS and JavaScript modules and **no build step**. GitHub Pages serves it as is.
- **IndexedDB** stores progress on the phone. The app asks the browser for persistent storage and offers **export/import of a backup file**.
- A **service worker** makes the app work offline. Only the AI features need a connection.
- **ts-fsrs** (MIT licence) for scheduling, copied into the repo.
- **MediaRecorder** for voice. Recognition goes through Whisper on OpenRouter rather than the browser's own speech recognition, because the browser version doesn't work in iOS home-screen apps.
- **Reminders:** a PWA can't schedule daily local notifications without a server. I said earlier it could send reminders; that was wrong. A recurring phone alarm or calendar event does the job.

## 8. Build phases

1. **Phase 1, core (about 1 session):**
   - App shell, installable PWA and offline support.
   - FSRS engine and the daily session flow.
   - Units 1–5 and the ear-training basics.
   - Multiple choice, tiles, cloze, typing and dictation, with phone TTS and forgiving marking.
   - Deployed to GitHub Pages and tested on your phone.
   **Status: done (v0.1).**
2. **Phase 2, speaking (status: done, v0.2):** two speech engines. OpenRouter Whisper large-v3 (open-weight, uses your key) or the phone's own recogniser (free, no key). There's a pronunciation coach on an open-weight audio model (Voxtral Small by default). Ladder rungs 6–7 are speaking ("listen and say it", "say the translation"), mixed with typing. Marking uses European Portuguese sound-alike matching in three tiers, retries, an "I said it right" self-grade, and playback of your own recording. Repeated sound problems pull matching ear training forward. Originally planned as: recording, Whisper transcription, tiered pronunciation feedback, slow playback, shadowing and the recurring-error drills.
3. **Phase 3, AI tutor:** role-plays, the prompt-first correction ladder, "Help me say it", hands-free mode and AI-generated extra sentences.
4. **Phase 4, depth:** units 6–20, stats such as retention and forecast, and settings for the retention target, daily new-item cap and session length.

---

### Sources

- Dunlosky et al. 2013, *Improving Students' Learning With Effective Learning Techniques*: https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html
- Wilson et al. 2019, *The Eighty Five Percent Rule for optimal learning*: https://pmc.ncbi.nlm.nih.gov/articles/PMC6831579
- Brunmair & Richter 2019, *Similarity matters: a meta-analysis of interleaved learning*: https://pubmed.ncbi.nlm.nih.gov/31556629/
- Lyster & Saito 2010, oral corrective feedback meta-analysis: https://discovery-pp.ucl.ac.uk/10066737/1/Saito%20AAM%20LIA-Lyster%20%26%20Saito-2010.pdf
- Uchihara, Karas & Thomson 2025, HVPT perception meta-analysis: https://resolve.cambridge.org/core/journals/studies-in-second-language-acquisition/article/high-variability-phonetic-training-hvpt-a-metaanalysis-of-l2-perceptual-training-studies/6ABB8C1F32D88D53EA8D05A4565E76F6/core-reader
- Uchihara, Karas & Thomson 2024, HVPT perception-to-production meta-analysis: https://www.cambridge.org/core/product/E38D8F5CE65DC708137B0E95F97C6BC7/core-reader
- Nation 2006, *How large a vocabulary is needed for reading and listening?*: https://www.wgtn.ac.nz/__data/assets/pdf_file/0018/1626120/2006-How-large-a-vocab.pdf
- FSRS vs SM-2 (Anki docs): https://docs.ankiweb.net/faqs/what-spaced-repetition-algorithm
- European Portuguese vowel reduction (learner-oriented): https://portuguesepedia.com/vowel-reduction-european-portuguese/
- European Portuguese stress vs vowel perception training (UAB thesis): https://repositorioaberto.uab.pt/entities/publication/744c0bff-c957-4ee8-a6f5-3bddc9242038
- OpenRouter speech-to-text, text-to-speech and audio docs: https://openrouter.ai/docs/guides/overview/multimodal/overview
- Web Speech API support (no speech recognition in iOS home-screen apps): https://caniuse.com/speech-recognition
- Also cited from established literature: Roediger & Karpicke 2006 (testing effect), Cepeda et al. 2006/2008 (spacing), Slamecka & Graf 1978 (generation effect), Kornell et al. 2009 (pretesting), Mackey & Goo 2007 (interaction), Swain (output), Krashen (input), FSI language difficulty rankings.
