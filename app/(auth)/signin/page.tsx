import { redirect } from "next/navigation";
import { signIn } from "@/auth/config";
import { getParent } from "@/features/auth/guard";

export default async function SignInPage() {
  // Already an allowlisted parent? Skip to the picker.
  if (await getParent()) redirect("/play");

  async function signInAction() {
    "use server";
    await signIn("google", { redirectTo: "/play" });
  }

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 text-center"
      data-testid="signin-page"
    >
      <div className="panel panel--glow flex max-w-sm flex-col items-center gap-6 p-10">
        <div className="text-7xl float" aria-hidden>
          🚀
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="title-pop text-5xl font-bold">Star Catchers</h1>
          <p className="text-[color:var(--ink-soft)]">
            Parents sign in to launch the adventure.
          </p>
        </div>
        <form action={signInAction} className="w-full">
          <button
            type="submit"
            data-testid="signin-google-button"
            className="btn btn--primary btn--lg w-full"
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </main>
  );
}
