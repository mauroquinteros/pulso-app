import { describe, expect, it } from "vitest";

import { initialsFrom } from "./profile";

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
