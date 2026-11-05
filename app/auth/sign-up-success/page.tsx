import Link from "next/link";

export const metadata = { title: "Check your email" };

export default function Page() {
  return (
    <>
      <h1 className="text-2xl">Check your email</h1>
      <p className="mt-4">Open the link we sent you to confirm your account.</p>
      <p className="mt-6 font-arial text-sm">
        <Link href="/auth/login" className="textlink">
          Back to log in
        </Link>
      </p>
    </>
  );
}
