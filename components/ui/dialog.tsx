// components/ui/dialog.tsx
"use client";

import * as RadixDialog from "@radix-ui/react-dialog";

export function Dialog({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: string;
  children: React.ReactNode; footer: React.ReactNode;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <RadixDialog.Content aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-40 flex max-h-[90svh] w-[calc(100vw-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-small border bg-abyss">
          <RadixDialog.Title className="border-b p-4 text-lg font-medium text-platinum">{title}</RadixDialog.Title>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm">{children}</div>
          <div className="flex justify-end gap-3 border-t p-4">
            <RadixDialog.Close className="cursor-pointer px-4 font-arial text-sm hover:text-platinum">Close</RadixDialog.Close>
            {footer}
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
