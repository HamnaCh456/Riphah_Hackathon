// components/ui/dialog.tsx
"use client";

import * as RadixDialog from "@radix-ui/react-dialog";

import { cn } from "@/lib/utils";

export function Dialog({ open, onClose, title, children, footer, size = "default" }: {
  open: boolean; onClose: () => void; title: string;
  children: React.ReactNode; footer?: React.ReactNode; size?: "default" | "wide";
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="dialog-fade fixed inset-0 z-40 bg-[rgba(11,37,69,0.45)]" />
        <RadixDialog.Content aria-describedby={undefined}
          className={cn(
            "fixed left-1/2 top-1/2 z-40 flex max-h-[90svh] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-card border bg-surface shadow-raised dialog-fade",
            size === "wide" ? "max-w-3xl" : "max-w-lg",
          )}>
          <RadixDialog.Title className="border-b p-4 text-lg font-medium text-navy">{title}</RadixDialog.Title>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm">{children}</div>
          <div className="flex flex-wrap items-center justify-end gap-3 border-t p-4">
            <RadixDialog.Close className="cursor-pointer px-4 font-arial text-sm transition-colors hover:text-brand-dark">Close</RadixDialog.Close>
            {footer}
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
