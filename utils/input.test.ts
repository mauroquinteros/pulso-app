import { describe, expect, it } from "vitest";

import { normalizeTicker, parseAmount, sanitizeDecimal, sanitizeSymbol } from "./input";

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

  it("drops a comma, which can only group thousands", () => {
    expect(sanitizeDecimal("1,000")).toBe("1000");
    expect(sanitizeDecimal("1,250.50")).toBe("1250.50");
  });
});

describe("sanitizeSymbol", () => {
  it("uppercases as the user types", () => {
    expect(sanitizeSymbol("aapl")).toBe("AAPL");
  });

  it("erases anything that is not a letter", () => {
    expect(sanitizeSymbol("AAPL1")).toBe("AAPL");
    expect(sanitizeSymbol("BRK.B")).toBe("BRKB"); // the field cannot type a dot
    expect(sanitizeSymbol("A A P L")).toBe("AAPL");
    expect(sanitizeSymbol("123")).toBe("");
  });

  it("leaves the field's contents in the canonical spelling", () => {
    // Whatever survives this is already what normalizeTicker would return, so
    // the two can never disagree about what is in the box.
    expect(normalizeTicker(sanitizeSymbol("  aapl.1 "))).toBe(sanitizeSymbol("  aapl.1 "));
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
