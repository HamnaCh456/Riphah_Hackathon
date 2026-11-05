import Image from "next/image";

import { cn } from "@/lib/utils";

/** For the navy navbar: the logo's navy mark needs a white tile, and its name is set in white. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 whitespace-nowrap text-[17px] font-semibold tracking-[-.015em]", className)}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-small bg-white">
        <Image src="/logo-mark.png" alt="" width={34} height={34} priority />
      </span>
      Riphah Recruitment
    </span>
  );
}

/** The whole logo with its tagline, for white backgrounds. */
export function LogoFull({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Riphah Recruitment. Find, assess, hire."
      width={960}
      height={274}
      priority
      className={cn("h-auto w-64", className)}
    />
  );
}
