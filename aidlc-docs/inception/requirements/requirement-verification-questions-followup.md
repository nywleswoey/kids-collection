# Requirements — Follow-up Questions

Thanks — answers received. Two things to resolve before I lock requirements.

---

## Question 16 — AI image generation (important)

You answered Q6 with *"just use my Claude subscription."* One technical reality to flag:

- **Claude (the Anthropic API) generates text, not images.** Claude is great for the **educational descriptions** on each card, but it **cannot draw the card pictures**.
- A **claude.ai Pro/Max subscription** also can't be called by an app — code needs a pay-as-you-go **API key** (separate from the chat subscription).

Good news: you chose a **pre-generated pool** (Q5=A), so images are made **once** during a seeding step — a small, one-time cost, not per-pull.

How do you want the **pictures** made? (text descriptions will use Claude either way)

A) **Claude text + a dedicated image model** (recommended). I generate the whole pool once. Pick the image source:

&nbsp;&nbsp;&nbsp;A1) Google Gemini image model (a.k.a. "Nano Banana" / Imagen) — strong, kid-friendly, cheap

&nbsp;&nbsp;&nbsp;A2) OpenAI `gpt-image-1`

&nbsp;&nbsp;&nbsp;A3) Replicate or fal (hosted open models — cheapest, many art styles)

B) **You supply the pictures** — you generate art yourself (via claude.ai, Midjourney, wherever), drop image files into a folder; the app does text + card assembly only. Zero image-API setup.

C) **Placeholder art for v1** — ship with simple generated/programmatic art now, wire a real image model in later.

X) Other (please describe after [Answer]: tag below)

[Answer]: X. Propose a free image generation service that can be called programmatically.

### 16b — API key for Claude text
The app will need an **`ANTHROPIC_API_KEY`** (pay-as-you-go, cents-level for one-time pool seeding). Are you OK creating one at console.anthropic.com?

A) Yes, I'll create an Anthropic API key

B) No — then card text must also be pre-written/another source (tell me)

X) Other

[Answer]: X. Give me a prompt to generate using my claude subscription.

---

## Question 17 — Parent sign-in

You said (Q1) sign in with *your* account, then pick a child profile. Simplest fit for one family:

A) **Single parent login** — one email + password you set (stored as an env secret), then a child profile-picker. No third-party auth service. Simplest, free. (recommended)

B) **Proper auth provider** (Clerk via Vercel Marketplace) — supports real multi-user accounts, password reset, etc. More setup; useful only if this grows beyond your family.

X) Other (please describe after [Answer]: tag below)

[Answer]: A. Use google auth for the parent account.

---

Fill the `[Answer]:` tags, save, then run **/aidlc:approve** (or "ready"). Then I write `requirements.md`.
