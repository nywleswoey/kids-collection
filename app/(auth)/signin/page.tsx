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
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center"
      data-testid="signin-page"
    >
      <h1 className="text-4xl font-bold">🃏 Card Collection</h1>
      <p className="max-w-sm opacity-80">Parents sign in to start playing.</p>
      <form action={signInAction}>
        <button
          type="submit"
          data-testid="signin-google-button"
          className="rounded-xl bg-white px-6 py-3 text-lg font-semibold text-gray-900 shadow-lg transition hover:scale-105"
        >
          Sign in with Google
        </button>
      </form>
    </main>
  );
}
