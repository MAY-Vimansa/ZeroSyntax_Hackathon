import { describe, it, expect } from "vitest";
import { parseTheme, resolveTheme } from "../src/lib/theme";
describe("theme preference", () => {
  it("only accepts supported theme names", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
    for (const invalid of ["system", "LIGHT", "", null, undefined, "<script>"])
      expect(parseTheme(invalid)).toBeNull();
  });
  it("uses the cookie for server/client consistency and migrates older storage", () => {
    expect(resolveTheme("light", "dark")).toBe("light");
    expect(resolveTheme(undefined, "light")).toBe("light");
  });
  it("falls back to dark for missing or corrupted preferences", () => {
    expect(resolveTheme("invalid", "invalid")).toBe("dark");
    expect(resolveTheme(null, null)).toBe("dark");
  });
});
