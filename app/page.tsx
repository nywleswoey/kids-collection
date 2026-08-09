import { redirect } from "next/navigation";

// SCRATCH — deliberate BUILD-only breakage. Proves the `build` gate catches
// something the other three cannot (#23): this is well-typed, so `typecheck`
// stays green, and no test imports a page module, so `test` stays green. It
// throws while `next build` collects page data.
throw new Error("scratch: prove the build gate goes red");

export default function Home() {
  // Entry point → profile picker (middleware/requireParent bounce to /signin if needed).
  redirect("/play");
}
