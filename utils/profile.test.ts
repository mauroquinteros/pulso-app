import type { Session, User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { initialsFrom, profileFrom } from "./profile";

/** Only the two fields the derivation reads; the rest of a Session is noise. */
const sessionFor = (user: Partial<User>) => ({ user }) as Session;

describe("profileFrom", () => {
  it("reads the name Supabase normalises Google's claims into", () => {
    const session = sessionFor({ email: "mauro@gmail.com", user_metadata: { full_name: "Mauro Quinteros" } });

    expect(profileFrom(session)).toEqual({ name: "Mauro Quinteros", email: "mauro@gmail.com" });
  });

  it("falls back to the raw `name` claim", () => {
    const session = sessionFor({ email: "mauro@gmail.com", user_metadata: { name: "Mauro Quinteros" } });

    expect(profileFrom(session).name).toBe("Mauro Quinteros");
  });

  it("prefers `full_name` when both are present", () => {
    const session = sessionFor({ user_metadata: { full_name: "Mauro Quinteros", name: "Mauro" } });

    expect(profileFrom(session).name).toBe("Mauro Quinteros");
  });

  it("gives an empty name when the provider sent none", () => {
    // Blank avatar disc, not a crash: initialsFrom("") is empty, not an error.
    const session = sessionFor({ email: "mauro@gmail.com", user_metadata: {} });

    expect(profileFrom(session)).toEqual({ name: "", email: "mauro@gmail.com" });
    expect(initialsFrom(profileFrom(session).name)).toBe("");
  });

  it("survives no session at all", () => {
    // The frame between signing out and the route guard unmounting the screens.
    expect(profileFrom(null)).toEqual({ name: "", email: "" });
    expect(profileFrom(undefined)).toEqual({ name: "", email: "" });
  });
});

describe("initialsFrom", () => {
  it("takes the first letter of the first two words", () => {
    expect(initialsFrom("Mauro Quinteros")).toBe("MQ");
  });

  it("ignores everything past the second word", () => {
    // Two letters is how a Peruvian writes their initials, not one per word.
    expect(initialsFrom("Mauro Quinteros Rojas")).toBe("MQ");
  });

  it("returns a single letter for a one-word name", () => {
    expect(initialsFrom("Mauro")).toBe("M");
  });

  it("always uppercases", () => {
    expect(initialsFrom("mauro quinteros")).toBe("MQ");
  });

  it("survives extra whitespace anywhere", () => {
    expect(initialsFrom("  Mauro   Quinteros  ")).toBe("MQ");
  });

  it("returns an empty string for a blank name", () => {
    expect(initialsFrom("")).toBe("");
    expect(initialsFrom("   ")).toBe("");
  });

  it("takes the particle when a surname has one - known and accepted", () => {
    // No particle heuristic on purpose. Asserted so nobody "fixes" it by
    // accident: "Mauro de la Cruz" reads its second word like any other.
    expect(initialsFrom("Mauro de la Cruz")).toBe("MD");
  });
});
