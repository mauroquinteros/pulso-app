import type { Session, User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { perfilChanged, perfilIdOf } from "./perfil-change";

/**
 * Only the field the rule reads. A real Session carries a token, an expiry and
 * a whole User; none of it decides this, which is the point.
 */
const sessionFor = (userId: string) => ({ user: { id: userId } as User }) as Session;

describe("perfilIdOf", () => {
  it("reads the Perfil's id off the session", () => {
    expect(perfilIdOf(sessionFor("perfil-a"))).toBe("perfil-a");
  });

  it("answers null when there is no session", () => {
    expect(perfilIdOf(null)).toBeNull();
  });
});

describe("perfilChanged", () => {
  it("says no to a token refresh - a new session object carrying the same Perfil", () => {
    // auth-js fires TOKEN_REFRESHED periodically and hands back a fresh object
    // every time. Comparing objects here would empty the History every few
    // minutes and send RequireHistory back behind its spinner over data that
    // was already correct.
    const before = sessionFor("perfil-a");
    const after = sessionFor("perfil-a");
    expect(after).not.toBe(before);

    expect(perfilChanged(perfilIdOf(before), after)).toBe(false);
  });

  it("says yes when another Perfil signs in", () => {
    expect(perfilChanged("perfil-a", sessionFor("perfil-b"))).toBe(true);
  });

  it("says yes when the session ends, however it ended", () => {
    // The event name is not consulted, so an expired refresh token, a
    // revocation server-side and the "Cerrar sesion" button are the same fact:
    // a session, then no session.
    expect(perfilChanged("perfil-a", null)).toBe(true);
  });

  it("says yes to the first session of a cold start", () => {
    // Nothing has been seen yet, so the previous id is null and the first
    // INITIAL_SESSION reads as a change. That is the answer we want: clearing
    // here is a no-op - the stores are module-level and start empty and
    // `unread` - and the alternative would need a fourth "not yet known" value
    // whose only job is to skip a clear that costs nothing.
    expect(perfilChanged(null, sessionFor("perfil-a"))).toBe(true);
  });

  it("says no when a cold start finds nobody signed in", () => {
    // INITIAL_SESSION also fires with `null` for a signed-out launch. Nothing
    // changed, and nothing should be thrown away.
    expect(perfilChanged(null, null)).toBe(false);
  });
});
