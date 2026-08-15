/**
 * AI Horde adapter — the escape hatch (#71 keyed it, #74 pinned its model).
 *
 * ── The verdict #74 reached ──────────────────────────────────────────────────
 * KEEP the hatch, pinned to `AlbedoBase XL (SDXL)`. #74 offered the opposite
 * outcome explicitly — if the horde drew the hard subjects no better than
 * Cloudflare, the honest answer was to reverse #71 and drop AI Horde entirely.
 * It did draw them better on two of the three failure classes, so the hatch
 * stays. The per-class evidence is on `params.model` below, where the choice is.
 *
 * ── Why it exists, and what its claim actually is ────────────────────────────
 * #71 keyed AI Horde for PERMISSION, not for skill: it is the only shortlisted
 * provider whose content policy plainly allows the weapon-bearing subjects the
 * runbook's hardest cards need, and it has no payment surface at all, so $0 is
 * structural rather than a policy that could change. It is deliberately NOT a
 * bake-off lane — registration buys about one image of kudos permanently, a
 * 30-card burst costs ~720, and #74 measured a queue position of 352 with a
 * ~2850s wait at zero kudos. That loses the map's throughput driver outright.
 * It earns its place as insurance for cards the lanes refused or drew badly,
 * invoked by name.
 *
 * ── The model pin is the whole of #74, and it is load-bearing twice ──────────
 * AI Horde has no default model, and leaving `models` unset is not a shrug — it
 * is two separate ways to break this app.
 *
 *   RESOLUTION. `waiting_prompt.py` caps an unpinned request at
 *   `max_res = 1024 + threads*10 - round(queue*0.9)`. That is not a tail risk
 *   at this horde's load: #74 measured 456px, 519px and 529px on three separate
 *   samples within one hour. A 768x768 request is REFUSED at those caps, not
 *   downgraded. Naming a model whose baseline is `stable_diffusion_xl`,
 *   `stable_cascade` or `flux_1` forces `max_res` to 1024 unconditionally, which
 *   is what turns the map's 768x768 invariant from a coin-flip into a guarantee.
 *
 *   CONTENT. The horde's catalogue is ranked by volunteer popularity, and its
 *   most-served image models are NSFW — `WAI-NSFW-illustrious-SDXL` has the
 *   highest worker count on the whole horde, then `Pony Diffusion XL`,
 *   `Hassaku XL`, `CyberRealistic Pony`. An unpinned request in a children's app
 *   is routed at those by popularity. Even inside the shortlist the trap is
 *   live: `AlbedoBase XL 3.1` is one character away from the pinned model's name
 *   and is flagged `nsfw: true` in the model reference.
 *
 * So the model is pinned HERE, in code, rather than read from `AIHORDE_MODEL`.
 * That follows the registry's own rule (`providers/index.ts`): the environment
 * carries secrets and nothing else, because anything that changes the BYTES must
 * be diffable in a pull request. It is also forced by the port — `params` is
 * hashed into the review filename, so an env-driven model would silently rename
 * every reviewed candidate the moment someone edited their `.env.local`, and
 * would let a typo point a kids' app at the NSFW near-namesake above with no
 * review step in between.
 *
 * ── What the pin does NOT promise ────────────────────────────────────────────
 * That the model is online. This is volunteer infrastructure and the catalogue
 * moves hour to hour — #74 watched Flux.1-Schnell's worker count drop from 2 to
 * 1 mid-run. A pinned model with no workers surfaces as `is_possible: false`,
 * which this adapter fails on by name rather than polling to the deadline.
 *
 * ── One logical attempt, four round-trips ────────────────────────────────────
 * Submit, poll, read status, download. The port is explicit that this loop lives
 * inside the adapter so the runner never learns that one provider is
 * asynchronous and the others are not.
 *
 * ── Expect to wait, and expect jobs to be dropped ────────────────────────────
 * This account holds ~14 kudos and contributes no worker, which puts every
 * request near the back of a global queue measured at 488-809 during #74. The
 * horde drops a request it has not handed to a worker in time, so a dropped job
 * is an ORDINARY outcome here, not an error — hence the `ProviderRetryable` on
 * the 404 below, and hence `concurrency: 1`. Work the horde cannot cover is the
 * first thing it sheds: three concurrent 3-image jobs (~600 kudos of work) lost
 * all three, where one job at a time survives.
 *
 * The practical consequence for a caller: reach for the hatch one card at a
 * time, and expect 30-45 minutes for it. #74 measured 12 images landing from a
 * 6-8 worker model, and zero from a 3-4 worker one.
 *
 * ── Pacing is per-IP, not per-endpoint ───────────────────────────────────────
 * Measured on #74's first run: the horde answers `429 {"message": "2 per 1
 * second"}`, and it counts every call — submits and polls together — against one
 * per-IP budget. Three lanes fanning out lost 7 of 12 submissions inside the
 * first second. The seam's gate is per-lane, so the only honest way to declare
 * that here is one request in flight at a time with a gap wider than the limit.
 * That costs nothing: an escape hatch generates one card at a time by design.
 */
import {
  assertOk,
  type FetchImpl,
  type HttpAdapterOptions,
  finishGeneration,
  readBytes,
} from "./http";
import {
  ProviderRetryable,
  type GeneratedImage,
  type ImageProvider,
  type ImageSizeRequest,
} from "./provider";

const ENDPOINT = "https://aihorde.net/api/v2";

/**
 * Identifies this client to the horde, as its API asks. Volunteer
 * infrastructure: being reachable when a client misbehaves is the etiquette.
 */
const CLIENT_AGENT = "kids-collection:1.0:github.com/nywleswoey/kids-collection";

export interface AiHordeOptions extends HttpAdapterOptions {
  /** Injectable so tests do not spend real seconds proving a poll loop. */
  sleep?: (ms: number) => Promise<void>;
  pollIntervalMs?: number;
  /**
   * How long one attempt waits before giving up on a job.
   *
   * Set GENEROUSLY, and measured the hard way during #74. The horde expires a
   * request that nobody CHECKS, not one that is merely slow — so an active poll
   * loop keeps a job alive indefinitely, and a client-side deadline is a pure
   * self-inflicted loss. #74's first run set this to 20 minutes and watched all
   * three lanes abandon jobs that had reached queue position 58 of 800, then
   * resubmit to the BACK of that queue. Giving up is strictly worse than waiting
   * whenever the job is still advancing.
   *
   * So this is a runaway guard, not a service-level expectation. At zero kudos a
   * single generation legitimately takes 30-45 minutes.
   */
  pollTimeoutMs?: number;
}

export function aiHorde(opts: AiHordeOptions = {}): ImageProvider {
  const fetchImpl: FetchImpl = opts.fetchImpl ?? fetch;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const pollIntervalMs = opts.pollIntervalMs ?? 8_000;
  const pollTimeoutMs = opts.pollTimeoutMs ?? 60 * 60_000;

  return {
    id: "ai-horde",
    role: "escape-hatch",
    // R2 delivery is WebP. `finishGeneration` sniffs the bytes, so a worker that
    // ever returned something else fails loudly rather than filling seed/review/
    // with extensions that lie.
    format: "webp",
    params: {
      /**
       * #74's answer, chosen by a human from a subject x model contact sheet.
       *
       * Exact catalogue name — the horde matches it literally, and a near-miss
       * is not a 404 but a DIFFERENT model. `AlbedoBase XL 3.1` is one character
       * away and is flagged `nsfw: true`. Baseline `stable_diffusion_xl`,
       * `nsfw: false`, highest worker count of any SFW SDXL-class model.
       *
       * What the bake-off actually found, against `cloudflare-sdxl` on the
       * runbook's three failure classes, 3 samples each at 768x768 through
       * `buildPrompt()`:
       *
       *   Longbowman (identity in a small held object) — the hatch EARNS ITS
       *   KEEP here. Cloudflare returned 0 of 3 usable: every sample duplicated
       *   the bow and baked a decorative frame border into the image, against
       *   ART_STYLE's "clean background". This model returned a clean single
       *   bow, single arrow, no frame — the first usable Longbowman the project
       *   has had.
       *
       *   Egyptian Charioteer (multi-object scene) — the best result seen for
       *   this class: correct golden two-wheeled chariot, nemes headdress, reins,
       *   sand. It still miscounts (one horse where the prompt says two), but
       *   nothing like the Victorian pony-trap the runbook records.
       *
       *   Swiss Guard (niche uniform accuracy) — NOT solved, and the failure is
       *   worth knowing before reaching for the hatch: this model gets the
       *   costume right where Cloudflare invents a generic modern uniform, but
       *   renders it PHOTO-REAL rather than cartoon, so it loses ART_STYLE. Both
       *   providers fail this class, differently.
       *
       * Per-worker censorship (#71's accepted risk) fired ZERO times across the
       * run, including on the weapon-bearing Longbowman.
       *
       * `Fustercluck` (style=artistic) is the obvious alternative — its catalogue
       * style reads closest to ART_STYLE's cartoon, which is exactly the axis
       * AlbedoBase loses on above. It remains UNTESTED, and not for want of
       * trying: four attempts, every one dropped by the horde before a worker
       * took it, at global queue positions 104, 38 and lower.
       *
       * The cause is structural rather than a fault in the model, and it is the
       * thing to understand before anyone retries. Kudos buy QUEUE POSITION, and
       * a request the horde has not handed to a worker in time is dropped. At
       * this account's balance (14 kudos, no worker contributed) we sit near the
       * back of a 500-800 deep global queue, so whether a job survives comes down
       * to how fast its model's own workers drain: AlbedoBase's 6-8 workers reach
       * us, Fustercluck's 3-4 do not. Shrinking the job from 3 images to 1 got it
       * measurably further and still not to a worker.
       *
       * So the honest state is: AlbedoBase is pinned on a complete grid,
       * Fustercluck is unjudged and unreachable at this kudos balance. If the
       * photo-real drift matters enough to settle, the lever is kudos (run a
       * horde worker), not another retry — or simply retry in a quiet window,
       * since the global queue has been seen between 488 and 809.
       */
      model: "AlbedoBase XL (SDXL)",
      steps: 25,
      cfg_scale: 7.5,
      sampler_name: "k_euler_a",
      karras: true,
      // Pinned like every other adapter's seed (#64) — never inherit a server
      // default nobody can see.
      seed: 42,

      /**
       * #71's ROUTING parameters live in the hashed bag too, because on this
       * provider routing decides the bytes.
       *
       * The port's rule is that `params` must be TOTAL — `generate()` builds its
       * request from `{prompt, size, ...params}` and nothing else — and these
       * are not incidental transport settings:
       *
       *   replacement_filter  false: the horde may otherwise rewrite the prompt
       *                       before a worker sees it, which would make the
       *                       review file's promptHash name a prompt that was
       *                       never sent.
       *   nsfw                false: gates which workers and models may take the
       *                       job, so it changes who draws the card.
       *   slow_workers        true: widens the worker pool to the slow
       *                       volunteers — at zero kudos they ARE the queue.
       *   r2                  true: decides the DELIVERY ENCODING. False returns
       *                       inline base64 PNG; true returns a WebP download.
       *                       It therefore decides `format` above, which names
       *                       the review file's extension.
       *   shared              false: false keeps generations out of the public
       *                       LAION dataset. True would earn a kudos bonus and
       *                       publish every card this app draws; that is an
       *                       outward-facing choice, so it is pinned off and
       *                       visible in the hash rather than left to a default.
       *   trusted_workers     false: does not restrict to trusted workers, which
       *                       at this queue depth would mean waiting far longer.
       *
       * `allow_downgrade` is absent from this bag ON PURPOSE and must stay
       * absent. The horde reads its PRESENCE, and it permits a smaller image
       * than requested — undoing the model pin above, which exists precisely to
       * stop 768x768 being negotiable.
       */
      replacement_filter: false,
      nsfw: false,
      slow_workers: true,
      r2: true,
      shared: false,
      trusted_workers: false,
    },
    // See the pacing note: the limit is per-IP across the whole API.
    minIntervalMs: 1_200,
    concurrency: 1,
    // No `typicalCardBytes`, deliberately (#79). It would be a WebP number, and
    // the twelve images this hatch has ever delivered came from one model on one
    // day at one worker's encoder settings — too thin to project a store budget
    // from, and getting a real sample means another 30-45 minute queue wait that
    // #74 showed is as likely to be dropped as answered. `blob-budget.ts` reports
    // it as UNMEASURED, which is the true statement.
    requiredEnv: ["AIHORDE_API_KEY"],
    isConfigured: () => Boolean(process.env.AIHORDE_API_KEY),

    async generate(prompt: string, size: ImageSizeRequest): Promise<GeneratedImage> {
      const apikey = process.env.AIHORDE_API_KEY ?? "";
      const headers = { apikey, "Client-Agent": CLIENT_AGENT };

      const submitted = await fetchImpl(`${ENDPOINT}/generate/async`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        // Built from `{prompt, size, ...params}` and nothing else, so "does this
        // adapter read anything outside params?" stays a checkable review
        // question. `n: 1` is the only literal, and it is not a parameter — one
        // generate() call is one card by definition of the port.
        body: JSON.stringify({
          prompt,
          params: {
            width: size.width,
            height: size.height,
            steps: this.params.steps,
            cfg_scale: this.params.cfg_scale,
            sampler_name: this.params.sampler_name,
            karras: this.params.karras,
            seed: String(this.params.seed),
            n: 1,
          },
          models: [this.params.model],
          nsfw: this.params.nsfw,
          slow_workers: this.params.slow_workers,
          replacement_filter: this.params.replacement_filter,
          r2: this.params.r2,
          shared: this.params.shared,
          trusted_workers: this.params.trusted_workers,
        }),
      });
      assertOk(this.id, submitted);
      const job = (await submitted.json()) as { id?: string; message?: string };
      if (!job.id) {
        throw new Error(`${this.id}: submit refused — ${job.message ?? "no job id returned"}`);
      }

      const deadline = Date.now() + pollTimeoutMs;
      for (;;) {
        const res = await fetchImpl(`${ENDPOINT}/generate/check/${job.id}`, { headers });
        if (res.status === 404) {
          // How staleness ACTUALLY presents, measured on #74's run: the horde
          // forgets a queued job and /check answers 404 — while the job is
          // still advancing, not after any client deadline. At a low kudos
          // balance it will not hold work the requester cannot cover, so this
          // is the ordinary case rather than an edge one (27 of 46 images on
          // one run).
          //
          // Retryable, and that classification is load-bearing: `assertOk`
          // would map a bare 404 to a non-retryable 4xx, the lane runner's
          // breaker would count three and abandon the lane, and the contact
          // sheet would report a provider that drew badly when in fact it never
          // drew at all.
          throw new ProviderRetryable(
            `${this.id}: the horde dropped job ${job.id} before it ran (404) — resubmitting is the remedy`,
          );
        }
        assertOk(this.id, res);
        const check = (await res.json()) as {
          done?: boolean;
          faulted?: boolean;
          is_possible?: boolean;
        };
        if (check.faulted) throw new Error(`${this.id}: the horde reported job ${job.id} faulted`);
        if (check.is_possible === false) {
          // Nothing online can serve it — which is what the pinned model losing
          // its last worker looks like. Not retryable: another attempt asks the
          // same impossible question.
          throw new Error(
            `${this.id}: no worker can serve this request — is "${String(this.params.model)}" still online?`,
          );
        }
        if (check.done) break;
        if (Date.now() >= deadline) {
          // A runaway guard, not a service level — see `pollTimeoutMs`. Retryable
          // rather than fatal, but note that a retry resubmits to the BACK of the
          // queue, so this is a loss either way and the deadline is set high
          // enough that reaching it means something is genuinely wrong.
          throw new ProviderRetryable(
            `${this.id}: gave up on job ${job.id} after ${Math.round(pollTimeoutMs / 60_000)} minutes`,
          );
        }
        await sleep(pollIntervalMs);
      }

      const statusRes = await fetchImpl(`${ENDPOINT}/generate/status/${job.id}`, { headers });
      assertOk(this.id, statusRes);
      const status = (await statusRes.json()) as {
        generations?: { img?: string; model?: string; censored?: boolean }[];
      };
      const generation = status.generations?.[0];
      if (!generation?.img) {
        throw new ProviderRetryable(`${this.id}: job ${job.id} finished with no generation`);
      }
      if (generation.censored) {
        // A censoring worker returns a BLACK FRAME, not a refusal. #71 accepted
        // that risk because it "fails visibly into review" — but a black frame
        // in seed/review/ is not visible, it reads as a model that drew nothing.
        // It is one volunteer's filter rather than a verdict on the prompt, so
        // another worker is a real remedy.
        throw new ProviderRetryable(
          `${this.id}: a worker censored this generation (a black frame, not a refusal) — retrying may reach a different worker`,
        );
      }

      const download = await fetchImpl(generation.img);
      assertOk(this.id, download);
      const bytes = await readBytes(this.id, download);
      // The WORKER's model, never the requested one (#64) — on the horde these
      // genuinely differ, since the pin is matched against a catalogue a
      // volunteer populated.
      return finishGeneration(this, bytes, size, generation.model);
    },
  };
}
