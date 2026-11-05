"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthField, FormError } from "@/components/auth/auth-field";
import { Button } from "@/components/ui/button";
import { ROLES, type Role } from "@/lib/auth/access";
import { firstError, signUpSchema } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<Role, string> = {
  candidate: "Candidate",
  recruiter: "Recruiter",
};

const EMAIL_TAKEN = "An account with this email already exists. Log in instead.";

export function SignUpForm() {
  const [role, setRole] = useState<Role>("candidate");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse({
      role,
      fullName,
      email,
      password,
      repeatPassword,
    });
    if (!parsed.success) return setError(firstError(parsed));

    setIsLoading(true);
    setError(null);
    const { data, error } = await createClient().auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { role: parsed.data.role, full_name: parsed.data.fullName },
      },
    });
    if (error) {
      setError(
        error.code === "user_already_exists"
          ? EMAIL_TAKEN
          : error.message,
      );
      setIsLoading(false);
      return;
    }
    // With email confirmation on, Supabase hides taken emails: a user with no identities.
    if (data.user?.identities?.length === 0) {
      setError(EMAIL_TAKEN);
      setIsLoading(false);
      return;
    }
    // No session means email confirmation is switched on for this project.
    router.push(data.session ? "/" : "/auth/sign-up-success");
    router.refresh();
  };

  return (
    <>
      <h1 className="text-2xl">Create your account</h1>
      <form onSubmit={handleSignUp} noValidate className="mt-8 grid gap-5">
        <fieldset className="grid gap-2">
          <legend className="mb-2 font-arial text-sm">I am a</legend>
          <div className="grid grid-cols-2 gap-2">
            {[...ROLES].reverse().map((option) => (
              <label
                key={option}
                className={cn(
                  "flex h-12 cursor-pointer items-center justify-center rounded-small font-arial text-sm transition-[background-color,box-shadow,color] duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-offset-[3px] has-[:focus-visible]:outline-lavender",
                  role === option
                    ? "bg-kelp text-platinum shadow-[inset_0_0_0_1px_var(--hairline-strong)]"
                    : "text-silver shadow-[inset_0_0_0_1px_var(--hairline)] hover:bg-wash hover:text-mist",
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value={option}
                  checked={role === option}
                  onChange={() => setRole(option)}
                  className="sr-only"
                />
                {ROLE_LABELS[option]}
              </label>
            ))}
          </div>
        </fieldset>
        <AuthField
          id="full-name"
          label="Full name"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <AuthField
          id="repeat-password"
          label="Repeat password"
          type="password"
          autoComplete="new-password"
          value={repeatPassword}
          onChange={(e) => setRepeatPassword(e.target.value)}
        />
        <FormError message={error} />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Creating account..." : "Create account"}
        </Button>
      </form>
      <p className="mt-6 font-arial text-sm">
        Already have an account?{" "}
        <Link href="/auth/login" className="textlink">
          Log in
        </Link>
      </p>
    </>
  );
}
