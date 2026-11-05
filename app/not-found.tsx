import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center p-5">
      <div className="card w-full max-w-sm p-6">
        <h1 className="text-xl">This page doesn&apos;t exist</h1>
        <p className="mt-2 text-sm">It may have moved, or you may not have access to it.</p>
        <Button asChild size="sm" className="mt-4">
          <Link href="/">Go to my dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
