import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-small text-sm font-medium leading-none transition-[background-color,border-color,box-shadow,color,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        // One per screen: the main action.
        primary:
          "bg-brand text-white shadow-card hover:-translate-y-px hover:bg-brand-dark hover:shadow-raised",
        ghost:
          "border border-hairline bg-surface text-ink hover:border-brand hover:bg-wash hover:text-brand-dark",
      },
      size: {
        default: "px-5 py-3.5",
        sm: "px-3.5 py-2.5",
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
  /** Shows a spinner and blocks clicks while the button's work runs. */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {asChild ? children : (
          <>
            {loading && <span aria-hidden="true" className="spinner" />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
