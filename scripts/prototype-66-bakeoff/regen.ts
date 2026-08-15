import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cloudflareSdxl } from "@/features/pool/providers/cloudflare-sdxl";
import { CARD_SIZE } from "@/features/pool/providers";
import { buildPrompt } from "@/features/pool/prompt";
import { reviewFileName, sidecarFileName, buildSidecar } from "@/features/pool/review-files";
const OUT = join(process.cwd(), "seed", "bakeoff-66");
const seed = JSON.parse(readFileSync(join(process.cwd(), "seed", "cards.json"), "utf8"));
const card = seed.themes.find((t: any) => t.name === "Warriors").cards.find((c: any) => c.name === "Swiss Guard");
(async () => {
  const p = cloudflareSdxl();
  for (let attempt = 1; attempt <= 4; attempt++) {
    const img = await p.generate(buildPrompt(card), CARD_SIZE);
    const kb = img.bytes.byteLength / 1024;
    console.log(`attempt ${attempt}: ${kb.toFixed(0)}K ${kb < 20 ? "BLANK, retrying" : "OK"}`);
    if (kb < 20) continue;
    writeFileSync(join(OUT, reviewFileName("Warriors", card, p)), img.bytes);
    writeFileSync(join(OUT, sidecarFileName("Warriors", card, p)), JSON.stringify(buildSidecar(p, img), null, 2) + "\n");
    console.log("saved", reviewFileName("Warriors", card, p));
    return;
  }
  console.log("blanked on every attempt");
})();
