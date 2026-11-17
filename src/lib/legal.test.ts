import { describe, expect, it } from "vitest";
import { helpLinks, legalLinks, proLink } from "./legal";

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

describe("help and feedback", () => {
  it("links the site's questions and a message to the support address", () => {
    expect(helpLinks("https://example.ca/", "aide@example.ca", "fr", "Cadence : aide")).toEqual({
      faq: "https://example.ca/fr/#faq",
      mail: "mailto:aide@example.ca?subject=Cadence%20%3A%20aide",
    });
  });
  it("leaves out whatever isn't set, or isn't safe", () => {
    expect(helpLinks(undefined, undefined, "en", "x")).toEqual({ faq: null, mail: null });
    expect(helpLinks("https://example.ca", "not an address", "en", "x").mail).toBeNull();
    expect(helpLinks("https://example.ca", "a@b.ca?cc=evil@x.com", "en", "x").mail).toBeNull();
  });
});

describe("proLink", () => {
  it("points at the site's offer in the person's language, or nowhere without an address", () => {
    expect(proLink("https://rebalanceweek.com/", "fr")).toBe("https://rebalanceweek.com/fr/#offer");
    expect(proLink("https://rebalanceweek.com", "en")).toBe("https://rebalanceweek.com/en/#offer");
    expect(proLink(undefined, "en")).toBeNull();
    expect(proLink("rebalanceweek.com", "en")).toBeNull();
  });
});
