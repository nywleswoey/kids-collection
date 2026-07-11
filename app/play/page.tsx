import Link from "next/link";
import { requireParent } from "@/features/auth/guard";
import { listChildren } from "@/features/profiles/service";
import { ProfileCard } from "@/features/profiles/ProfileCard";
import { signOutAction } from "@/features/profiles/actions";

export default async function ProfilePickerPage() {
  await requireParent();
  const kids = await listChildren();

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-8 p-8"
      data-testid="profile-picker"
    >
      <h1 className="text-3xl font-bold">Who&apos;s playing?</h1>

      {kids.length === 0 ? (
        <p className="opacity-80">
          No profiles yet.{" "}
          <Link href="/admin/profiles" className="underline">
            Add one
          </Link>
          .
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-6">
          {kids.map((c) => (
            <ProfileCard key={c.id} id={c.id} name={c.name} avatar={c.avatar} />
          ))}
        </div>
      )}

      <div className="flex gap-4 text-sm opacity-80">
        <Link href="/admin" data-testid="admin-link" className="underline">
          Parent admin
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            data-testid="sign-out-button"
            className="underline"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
