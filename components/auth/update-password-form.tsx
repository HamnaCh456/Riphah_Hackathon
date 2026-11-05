"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthField, FormError } from "@/components/auth/auth-field";
import { Button } from "@/components/ui/button";
import { firstError, password as passwordRule } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = passwordRule.safeParse(password);
    if (!parsed.success) return setError(firstError(parsed));

    setIsLoading(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({
      password: parsed.data,
    });
    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <h1 className="text-2xl">Choose a new password</h1>
      <form onSubmit={handleSubmit} noValidate className="mt-8 grid gap-5">
        <AuthField
          id="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FormError message={error} />
        <Button type="submit" className="w-full" loading={isLoading}>
          {isLoading ? "Saving..." : "Save new password"}
        </Button>
      </form>
    </>
  );
}
