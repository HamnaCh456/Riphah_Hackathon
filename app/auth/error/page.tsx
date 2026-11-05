import Link from "next/link";

export const metadata = { title: "Link problem | Talent Intelligence" };

export default function Page() {
  return (
    <>
      <h1 className="text-2xl">This link didn&apos;t work</h1>
      <p className="mt-4">It may have expired or already been used.</p>
      <p className="mt-6 font-arial text-sm">
        <Link href="/auth/login" className="textlink">
          Back to log in
        </Link>
      </p>
    </>
  );
}
