import { describe, it, expect } from "vitest";
import { adminCsv, matchesAdminSearch } from "../src/lib/admin";
import { authDestination } from "../src/lib/auth";

describe("admin record search and exports", () => {
  it("finds all query terms across fields without case sensitivity", () => {
    expect(matchesAdminSearch(" COLOMBO Ravi ", "Ravi Perera", "Colombo")).toBe(
      true,
    );
    expect(matchesAdminSearch("Colombo Ravi", "Ravi Perera", "Gampaha")).toBe(
      false,
    );
    expect(matchesAdminSearch("", undefined, "")).toBe(true);
  });
  it("preserves commas, quotes and newlines in CSV cells", () => {
    expect(adminCsv([["A, B", 'a"b', "line\nbreak", 42]])).toBe(
      '"A, B","a""b","line\nbreak","42"',
    );
  });
  it("neutralizes spreadsheet formulas in user-controlled content", () => {
    const cells = [
      "=1+1",
      "+cmd",
      "-1+2",
      "@SUM(A1)",
      "  =1",
      "\tformula",
      "\nformula",
    ];
    for (const cell of cells) expect(adminCsv([[cell]])).toBe(`"'${cell}"`);
  });
  it("routes an administrator to the protected workspace after login", () => {
    expect(authDestination("ADMIN")).toBe("/admin");
    expect(authDestination("ADMIN", "//untrusted.example")).toBe("/admin");
  });
});
