"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthField, FormError } from "@/components/auth/auth-field";
import { Button } from "@/components/ui/button";
import { firstError, loginSchema } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) return setError(firstError(parsed));

    setIsLoading(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword(parsed.data);
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "That email and password don't match."
          : error.message,
      );
      setIsLoading(false);
      return;
    }
    // The home route sends each role to its own jobs page.
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <h1 className="text-2xl">Log in</h1>
      <form onSubmit={handleLogin} noValidate className="mt-8 grid gap-5">
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aside={
            <Link
              href="/auth/forgot-password"
              className="textlink font-arial text-sm"
            >
              Forgot password?
            </Link>
          }
        />
        <FormError message={error} />
        <Button type="submit" className="w-full" loading={isLoading}>
          {isLoading ? "Logging in..." : "Log in"}
        </Button>
      </form>
      <p className="mt-6 font-arial text-sm">
        New here?{" "}
        <Link href="/auth/sign-up" className="textlink">
          Create an account
        </Link>
      </p>
    </>
  );
}
