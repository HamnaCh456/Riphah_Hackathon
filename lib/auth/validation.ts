import { z } from "zod";
import { ROLES } from "./access";

const email = z.string().trim().email("Enter a valid email address.");
export const password = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be 72 characters or fewer.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z
  .object({
    role: z.enum(ROLES),
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name.")
      .max(100, "Full name must be 100 characters or fewer."),
    email,
    password,
    repeatPassword: z.string(),
  })
  .refine((data) => data.password === data.repeatPassword, {
    message: "Passwords do not match.",
    path: ["repeatPassword"],
  });

export const forgotPasswordSchema = z.object({ email });

/** The first problem as one plain sentence, or null if the input is valid. */
export function firstError(result: z.SafeParseReturnType<unknown, unknown>) {
  return result.success ? null : result.error.issues[0].message;
}
