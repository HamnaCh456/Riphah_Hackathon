import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthField({
  id,
  label,
  aside,
  ...props
}: React.ComponentProps<typeof Input> & {
  id: string;
  label: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {aside}
      </div>
      <Input id={id} name={id} required {...props} />
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="font-arial text-sm text-coral">
      {message}
    </p>
  );
}
