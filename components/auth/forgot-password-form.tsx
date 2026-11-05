"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthField, FormError } from "@/components/auth/auth-field";
import { Button } from "@/components/ui/button";
import { firstError, forgotPasswordSchema } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) return setError(firstError(parsed));

    setIsLoading(true);
    setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(
      parsed.data.email,
      {
        redirectTo: `${window.location.origin}/auth/update-password`,
      },
    );
    setIsLoading(false);
    if (error) return setError(error.message);
    setSent(true);
  };

  if (sent) {
    return (
      <>
        <h1 className="text-2xl">Check your email</h1>
        <p className="mt-4">
          If {email} has an account, a reset link is on its way.
        </p>
        <p className="mt-6 font-arial text-sm">
          <Link href="/auth/login" className="textlink">
            Back to log in
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl">Reset your password</h1>
      <form onSubmit={handleSubmit} noValidate className="mt-8 grid gap-5">
        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FormError message={error} />
        <Button type="submit" className="w-full" loading={isLoading}>
          {isLoading ? "Sending..." : "Send reset link"}
        </Button>
      </form>
      <p className="mt-6 font-arial text-sm">
        <Link href="/auth/login" className="textlink">
          Back to log in
        </Link>
      </p>
    </>
  );
}
