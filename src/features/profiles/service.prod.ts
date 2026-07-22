import "server-only";
import { pgProfileStore } from "@/db/stores/profile-store.pg";
import { makeProfileService } from "./service";

/** Prod-wired profile service: the factory bound to the pg ProfileStore, once. */
export const profileService = makeProfileService({ profiles: pgProfileStore });
