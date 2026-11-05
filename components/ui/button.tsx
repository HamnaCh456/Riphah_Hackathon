import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-small font-arial text-sm leading-none tracking-[.02em] transition-[filter,background-color,box-shadow,color,transform] duration-200 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // One per screen: the main action. Abyss ink on the light gradient.
        primary:
          "bg-aurora text-abyss hover:-translate-y-px hover:brightness-105",
        ghost:
          "text-mist shadow-[inset_0_0_0_1px_var(--hairline)] hover:bg-wash hover:shadow-[inset_0_0_0_1px_var(--hairline-strong)]",
      },
      size: {
        default: "px-[22px] py-[15px]",
        sm: "px-4 py-[11px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
