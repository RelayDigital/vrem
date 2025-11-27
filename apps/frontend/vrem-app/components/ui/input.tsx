import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const inputVariants = cva(
  "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex w-full min-w-0 rounded-md transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "border-input bg-input-background dark:bg-input/30 border px-3 py-1",
        outline:
          "border-2 bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 border px-3 py-1",
        ghost:
          "border-0 bg-transparent hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 px-3 py-1",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 py-1",
        muted:
          "border-transparent bg-muted text-foreground hover:bg-muted/80 px-3 py-1",
        flat: "border-0 bg-transparent px-3 py-1",
      },
      size: {
        default: "h-9 text-base md:text-sm",
        sm: "h-8 text-sm px-2.5 py-1",
        lg: "h-10 text-base px-4 py-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Input({
  className,
  type,
  variant,
  size,
  ...props
}: React.ComponentProps<"input"> & VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Input, inputVariants };
