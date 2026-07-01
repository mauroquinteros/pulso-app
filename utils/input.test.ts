import { describe, expect, it } from "vitest";

import { normalizeTicker, parseAmount, sanitizeDecimal } from "./input";

describe("sanitizeDecimal", () => {
  it("strips non-numeric characters", () => {
    expect(sanitizeDecimal("12a.3")).toBe("12.3");
    expect(sanitizeDecimal("$50")).toBe("50");
    expect(sanitizeDecimal("abc")).toBe("");
  });

  it("keeps only the first decimal point", () => {
    expect(sanitizeDecimal("1.2.3")).toBe("1.23");
    expect(sanitizeDecimal("1..2")).toBe("1.2");
  });

  it("leaves a clean decimal untouched", () => {
    expect(sanitizeDecimal("349.60")).toBe("349.60");
    expect(sanitizeDecimal("")).toBe("");
  });
});

describe("parseAmount", () => {
  it("parses a decimal string", () => {
    expect(parseAmount("349.60")).toBe(349.6);
  });

  it("strips thousands commas", () => {
    expect(parseAmount("1,250.50")).toBe(1250.5);
  });

  it("returns 0 for blank or garbage", () => {
    expect(parseAmount("")).toBe(0);
    expect(parseAmount("abc")).toBe(0);
  });
});

describe("normalizeTicker", () => {
  it("trims and uppercases", () => {
    expect(normalizeTicker("  goog ")).toBe("GOOG");
    expect(normalizeTicker("aapl")).toBe("AAPL");
  });

  it("returns empty for whitespace-only", () => {
    expect(normalizeTicker("   ")).toBe("");
  });
});
