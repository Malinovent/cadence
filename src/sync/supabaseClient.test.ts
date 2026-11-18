import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { authError } from "./supabaseClient";

describe("authError: what a Supabase auth error means for the person", () => {
  it("tells a wrong password apart from an email not confirmed yet", () => {
    expect(
      authError(
        new AuthApiError(
          "Invalid login credentials",
          400,
          "invalid_credentials",
        ),
      ).kind,
    ).toBe("bad_credentials");
    expect(
      authError(
        new AuthApiError("Email not confirmed", 400, "email_not_confirmed"),
      ).kind,
    ).toBe("not_confirmed");
  });
  it("maps weak passwords, rate limits and network failures", () => {
    expect(authError(new AuthApiError("weak", 422, "weak_password")).kind).toBe(
      "weak_password",
    );
    expect(
      authError(new AuthApiError("slow down", 429, "over_request_rate_limit"))
        .kind,
    ).toBe("rate_limited");
    expect(
      authError(new AuthApiError("emails", 400, "over_email_send_rate_limit"))
        .kind,
    ).toBe("rate_limited");
    expect(
      authError(new AuthRetryableFetchError("Failed to fetch", 0)).kind,
    ).toBe("network");
  });
  it("anything else is a plain failure", () => {
    expect(authError(new AuthApiError("odd", 400, "something_else")).kind).toBe(
      "failed",
    );
    expect(authError(new Error("boom")).kind).toBe("failed");
  });
});
