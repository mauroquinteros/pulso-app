/**
 * Derives what a Perfil shows. Initials are computed at display time and never
 * stored, so `Profile` holds a name and nothing spelled out of it.
 */

import type { Session } from "@supabase/supabase-js";

import type { Profile } from "@/types/models";

/**
 * The Perfil a session describes. Same rule one level up: read at display time,
 * written nowhere - the JWT already owns these two facts.
 *
 * Google puts the name in `user_metadata` on first sign-in. `full_name` is the
 * key Supabase normalises the OIDC claims into and `name` is the raw claim; both
 * arrive from Google, so both are read. Nothing in `user_metadata` is trusted:
 * it is client-writable through `updateUser({ data })`, which is harmless for a
 * display name and would be a hole for a role or an allowlist.
 *
 * Every field falls back to `""` rather than throwing. A provider that returns
 * no name gives a blank avatar disc - ugly, not fatal - and the session itself
 * can be missing for the frame between signing out and the route guard tearing
 * these screens down.
 */
export function profileFrom(session: Session | null | undefined): Profile {
  const user = session?.user;
  return {
    name: user?.user_metadata.full_name ?? user?.user_metadata.name ?? "",
    email: user?.email ?? "",
  };
}

/** First letter of the first two words, uppercased. */
export function initialsFrom(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}
