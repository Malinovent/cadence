import { describe, expect, it } from "vitest";
import {
  authErrorMessage,
  authProviders,
  isRemoteApply,
  isValidEmail,
  isValidPassword,
  statusBadge,
  statusSentence,
} from "./syncUi";

describe("statusBadge", () => {
  it("maps each signed-in status to a label and dot colour", () => {
    expect(statusBadge("synced")).toEqual({ label: "synced", dot: "#1FA98A" });
    expect(statusBadge("syncing")).toEqual({ label: "syncing…", dot: "#C9A227" });
    expect(statusBadge("offline")).toEqual({ label: "offline", dot: "#cabfb2" });
    expect(statusBadge("error")).toEqual({ label: "sync error", dot: "#b54" });
  });
  it("shows nothing when local", () => expect(statusBadge("local")).toBeNull());
});

describe("statusSentence", () => {
  it("uses the SPEC sentences", () => {
    expect(statusSentence("synced")).toBe("Everything's synced.");
    expect(statusSentence("syncing")).toBe("Saving changes…");
    expect(statusSentence("offline")).toBe("Offline. Changes are saved on this device and will sync later.");
    expect(statusSentence("error")).toBe(
      "Couldn't reach your account. Changes are saved on this device and will sync later.",
    );
    expect(statusSentence("local")).toBeNull();
  });
});

describe("authErrorMessage", () => {
  it("maps every failure reason", () => {
    expect(authErrorMessage("bad_credentials")).toBe("That email and password don't match.");
    expect(authErrorMessage("not_confirmed")).toBe("Confirm your email first: the link is in your inbox.");
    expect(authErrorMessage("weak_password")).toBe("Use at least 8 characters.");
    expect(authErrorMessage("rate_limited")).toBe("Too many tries for now. Wait a minute and try again.");
    expect(authErrorMessage("offline")).toBe("You're offline. Connect and try again.");
    expect(authErrorMessage("failed")).toBe("Something went wrong. Try again.");
  });
});

describe("isValidEmail", () => {
  it("accepts plain addresses, trimming spaces", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("  jp.provost+x@mail.example.com ")).toBe(true);
  });
  it("rejects malformed ones", () => {
    for (const e of ["", "a", "a@b", "@b.co", "a@.co", "a b@c.co", "a@b.co x", "a@@b.co"])
      expect(isValidEmail(e)).toBe(false);
  });
});

describe("isRemoteApply", () => {
  const a = {};
  const b = {};
  it("is a remote apply when data changed under a new edit time and the document is clean", () => {
    expect(isRemoteApply({ data: a, updatedAt: 4 }, b, { updatedAt: 5, syncedAt: 5 })).toBe(true);
  });
  it("is not when the change is a dirty user edit", () => {
    expect(isRemoteApply({ data: a, updatedAt: 5 }, b, { updatedAt: 6, syncedAt: 5 })).toBe(false);
    expect(isRemoteApply({ data: a, updatedAt: 5 }, b, { updatedAt: 6, syncedAt: null })).toBe(false);
  });
  it("is not when data is unchanged (meta-only update)", () => {
    expect(isRemoteApply({ data: a, updatedAt: 4 }, a, { updatedAt: 5, syncedAt: 5 })).toBe(false);
  });
  it("is not an automatic change: the edit time stays, so an open editor is left alone", () => {
    expect(isRemoteApply({ data: a, updatedAt: 5 }, b, { updatedAt: 5, syncedAt: 5 })).toBe(false);
  });
});

describe("authProviders", () => {
  it("only the providers switched on, Google first; none by default", () => {
    expect(authProviders(undefined)).toEqual([]);
    expect(authProviders("")).toEqual([]);
    expect(authProviders("apple, Google")).toEqual(["google", "apple"]);
    expect(authProviders("google,github")).toEqual(["google"]);
  });
});

describe("isValidPassword", () => {
  it("needs at least 8 characters", () => {
    expect(isValidPassword("1234567")).toBe(false);
    expect(isValidPassword("12345678")).toBe(true);
  });
});
