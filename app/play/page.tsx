import Link from "next/link";
import { requireParent } from "@/features/auth/guard";
import { profileService } from "@/features/profiles/service.prod";
import { ProfileCard } from "@/features/profiles/ProfileCard";
import { signOutAction } from "@/features/profiles/actions";

export default async function ProfilePickerPage() {
  await requireParent();
  const kids = await profileService.listChildren();

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-8 p-8"
      data-testid="profile-picker"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="pill pill--gold">✨ Choose your player</span>
        <h1 className="title-pop text-4xl font-bold">Who&apos;s playing?</h1>
      </div>

      {kids.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 px-6 py-4 text-[color:var(--ink-soft)]">
          <span>No profiles yet.</span>
          <Link href="/admin/profiles" className="btn btn--ghost">
            ➕ Add one
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-6">
          {kids.map((c) => (
            <ProfileCard key={c.id} id={c.id} name={c.name} avatar={c.avatar} />
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 text-sm">
        <Link href="/admin" data-testid="admin-link" className="btn btn--ghost">
          🛠️ Parent admin
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            data-testid="sign-out-button"
            className="btn btn--ghost"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
