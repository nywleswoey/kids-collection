export default function Home() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center"
      data-testid="home-page"
    >
      <h1 className="text-4xl font-bold">🃏 Card Collection</h1>
      <p className="max-w-md text-lg opacity-80">
        A collectible card binder for kids. Foundation is ready — sign-in,
        profiles, pulling, and the binder arrive in the next units.
      </p>
    </main>
  );
}
