import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[14px] font-normal ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 dark:focus-visible:ring-primary/40 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white hover:bg-primary/90 active:bg-primary/80 dark:bg-primary dark:hover:bg-primary/90 dark:active:bg-primary/80",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-transparent text-breneo-blue hover:bg-breneo-blue/10 dark:border-white/20 dark:text-breneo-blue-dark dark:hover:bg-breneo-blue-dark/10",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/90",
        ghost:
          "text-breneo-blue hover:bg-breneo-blue/10 hover:text-breneo-blue dark:text-breneo-blue-dark dark:hover:bg-breneo-blue-dark/10 dark:hover:text-breneo-blue-dark",
        link:
          "text-breneo-blue underline-offset-4 hover:underline dark:text-breneo-blue-dark",
      },
      size: {
        default: "h-12 px-8 text-[15px] leading-[22px]",
        sm: "h-10 px-6 text-sm leading-[20px] [&_svg]:size-4",
        xs: "h-11 px-5 text-sm leading-[20px] [&_svg]:size-4", // Smaller button with bigger height than sm
        lg: "h-14 px-10 text-lg leading-[26px] [&_svg]:size-6",
        icon: "h-12 w-12 p-0 [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
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
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
