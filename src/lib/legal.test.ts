import { describe, expect, it } from "vitest";
import { legalLinks } from "./legal";

describe("legal links", () => {
  it("point at the site's pages in the person's language", () => {
    expect(legalLinks("https://example.ca/", "fr")).toEqual({
      privacy: "https://example.ca/fr/confidentialite/",
      terms: "https://example.ca/fr/conditions/",
    });
    expect(legalLinks("https://example.ca", "en")?.privacy).toBe("https://example.ca/en/privacy/");
  });
  it("are absent until the site's address is set, and only for http(s)", () => {
    expect(legalLinks(undefined, "fr")).toBeNull();
    expect(legalLinks("  ", "fr")).toBeNull();
    expect(legalLinks("javascript:alert(1)", "en")).toBeNull();
  });
});
