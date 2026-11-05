import { describe, expect, it } from "vitest";
import { requiredRole, roleHome, safeNextPath } from "./access";

describe("requiredRole", () => {
  it("protects the recruiter and candidate areas", () => {
    expect(requiredRole("/recruiter")).toBe("recruiter");
    expect(requiredRole("/recruiter/applications/1")).toBe("recruiter");
    expect(requiredRole("/candidate/applications")).toBe("candidate");
  });

  it("leaves other paths open to any signed-in user", () => {
    expect(requiredRole("/")).toBeNull();
    expect(requiredRole("/forbidden")).toBeNull();
    expect(requiredRole("/recruiters-guide")).toBeNull();
  });
});

describe("roleHome", () => {
  it("sends each role to its own dashboard", () => {
    expect(roleHome("recruiter")).toBe("/recruiter");
    expect(roleHome("candidate")).toBe("/candidate");
  });
});

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/auth/update-password")).toBe(
      "/auth/update-password",
    );
  });

  it("rejects anything that could leave the site", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
  });
});
