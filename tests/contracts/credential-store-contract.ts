import { describe, it, expect } from "vitest";
import type {
  AdminCredentialStore,
  NewAdminCredential,
} from "@/db/stores/credential-store";

/**
 * Shared AdminCredentialStore conformance spec — run against BOTH the in-memory
 * fake and the pg adapter. Pins the contracts the WebAuthn flow depends on:
 * per-parent isolation, newest-first ordering, null-on-duplicate enrolment, and
 * recordUse being a safe no-op for an unknown credential.
 *
 * `makeStore()` must return a FRESH, isolated store each call.
 */
export function runAdminCredentialStoreContract(
  label: string,
  makeStore: () => AdminCredentialStore | Promise<AdminCredentialStore>,
) {
  const PARENT = "google-sub-1";
  const OTHER = "google-sub-2";

  const cred = (over: Partial<NewAdminCredential> = {}): NewAdminCredential => ({
    parentId: PARENT,
    credentialId: "cred-a",
    publicKey: "pk-a",
    counter: 0,
    transports: ["internal", "hybrid"],
    label: "1Password",
    ...over,
  });

  describe(`AdminCredentialStore contract: ${label}`, () => {
    it("create returns the stored row with transports comma-joined", async () => {
      const store = await makeStore();
      const row = await store.create(cred());
      expect(row).toMatchObject({
        parentId: PARENT,
        credentialId: "cred-a",
        publicKey: "pk-a",
        counter: 0,
        transports: "internal,hybrid",
        label: "1Password",
      });
      expect(row?.lastUsedAt ?? null).toBeNull();
    });

    it("create returns null for a duplicate credential id", async () => {
      const store = await makeStore();
      expect(await store.create(cred())).not.toBeNull();
      // Same credential id, different parent and key — still a duplicate.
      expect(await store.create(cred({ parentId: OTHER, publicKey: "pk-z" }))).toBeNull();
    });

    it("findByCredentialId returns the row, or null when unknown", async () => {
      const store = await makeStore();
      await store.create(cred());
      expect((await store.findByCredentialId("cred-a"))?.publicKey).toBe("pk-a");
      expect(await store.findByCredentialId("nope")).toBeNull();
    });

    it("listByParent isolates parents", async () => {
      const store = await makeStore();
      await store.create(cred({ credentialId: "mine" }));
      await store.create(cred({ parentId: OTHER, credentialId: "theirs" }));

      expect((await store.listByParent(PARENT)).map((r) => r.credentialId)).toEqual(["mine"]);
      expect((await store.listByParent(OTHER)).map((r) => r.credentialId)).toEqual(["theirs"]);
      expect(await store.listByParent("nobody")).toEqual([]);
    });

    it("listByParent returns newest enrolment first", async () => {
      const store = await makeStore();
      await store.create(cred({ credentialId: "first" }));
      await store.create(cred({ credentialId: "second" }));
      await store.create(cred({ credentialId: "third" }));

      expect((await store.listByParent(PARENT)).map((r) => r.credentialId)).toEqual([
        "third",
        "second",
        "first",
      ]);
    });

    it("recordUse stores the counter and stamps lastUsedAt", async () => {
      const store = await makeStore();
      await store.create(cred());
      const at = new Date("2026-01-02T03:04:05.000Z");

      await store.recordUse("cred-a", 7, at);

      const row = await store.findByCredentialId("cred-a");
      expect(row?.counter).toBe(7);
      expect(row?.lastUsedAt?.toISOString()).toBe(at.toISOString());
    });

    it("recordUse is a no-op for an unknown credential id", async () => {
      const store = await makeStore();
      await store.create(cred());

      await expect(store.recordUse("ghost", 99, new Date())).resolves.toBeUndefined();

      // The real credential is untouched.
      expect((await store.findByCredentialId("cred-a"))?.counter).toBe(0);
    });

    it("remove deletes by row id", async () => {
      const store = await makeStore();
      const row = await store.create(cred());
      await store.remove(row!.id);

      expect(await store.findByCredentialId("cred-a")).toBeNull();
      expect(await store.listByParent(PARENT)).toEqual([]);
    });
  });
}
