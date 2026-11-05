import { describe, expect, it } from "vitest";
import { firstError, signUpSchema } from "./validation";

const valid = {
  role: "candidate",
  fullName: "Sara Khan",
  email: "sara@example.com",
  password: "correct-horse",
  repeatPassword: "correct-horse",
};

const errorFor = (changes: object) =>
  firstError(signUpSchema.safeParse({ ...valid, ...changes }));

describe("signUpSchema", () => {
  it("accepts a complete form", () => {
    expect(errorFor({})).toBeNull();
  });

  it("rejects roles other than recruiter and candidate", () => {
    expect(errorFor({ role: "admin" })).not.toBeNull();
  });

  it("names the field that is wrong", () => {
    expect(errorFor({ fullName: " " })).toBe("Enter your full name.");
    expect(errorFor({ email: "nope" })).toBe("Enter a valid email address.");
    expect(errorFor({ password: "short", repeatPassword: "short" })).toBe(
      "Password must be at least 8 characters.",
    );
    expect(errorFor({ repeatPassword: "different" })).toBe(
      "Passwords do not match.",
    );
  });
});
