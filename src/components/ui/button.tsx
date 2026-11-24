import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Loader2 } from "@/components/icons";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl font-normal ring-offset-background transition-[background-color,color,transform,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white hover:bg-primary/90 active:scale-[0.98] active:bg-primary/80 dark:bg-primary dark:hover:bg-primary/90 dark:active:bg-primary/80",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98] active:bg-destructive/80",
        success:
          "bg-green-600 text-white hover:bg-green-700 active:scale-[0.98] active:bg-green-800",
        outline:
          "border border-input bg-transparent text-breneo-blue hover:bg-breneo-blue/10 dark:border-white/20 dark:text-breneo-blue-dark dark:hover:bg-breneo-blue-dark/10",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/90 active:scale-[0.98]",
        ghost:
          "text-breneo-blue hover:bg-breneo-blue/10 hover:text-breneo-blue active:scale-[0.98] dark:text-breneo-blue-dark dark:hover:bg-breneo-blue-dark/10 dark:hover:text-breneo-blue-dark",
        link:
          "text-breneo-blue underline-offset-4 hover:underline dark:text-breneo-blue-dark",
      },
      size: {
        default: "h-12 min-w-[112px] px-6 py-3.5 text-base leading-5 [&_svg]:size-[18px]",
        sm: "h-9 px-3.5 text-sm leading-5 [&_svg]:size-4",
        xs: "h-7 px-2.5 text-xs leading-4 [&_svg]:size-[14px]",
        lg: "h-[52px] px-6 text-base leading-5 [&_svg]:size-5",
        icon: "h-10 w-10 min-w-0 p-0 [&_svg]:size-[18px]",
        "icon-lg": "h-12 w-12 min-w-0 p-0 [&_svg]:size-5",
        "icon-sm": "h-8 w-8 min-w-0 p-0 [&_svg]:size-4",
        "icon-xs": "h-7 w-7 min-w-0 p-0 [&_svg]:size-[14px]",
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
  /** Renders a spinner and prevents duplicate interactions while work is pending. */
  loading?: boolean;
  /** Optional icon rendered before or after the label. */
  icon?: React.ReactNode;
  iconPosition?: "start" | "end";
  /** Makes the button fill its available inline space. */
  fullWidth?: boolean;
  /** Uses the app's pill-shaped radius. */
  rounded?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      icon,
      iconPosition = "start",
      fullWidth = false,
      rounded = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const content = asChild ? (
      children
    ) : (
      <>
        {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {!loading && iconPosition === "start" ? icon : null}
        {children}
        {!loading && iconPosition === "end" ? icon : null}
      </>
    );

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size }),
          fullWidth && "w-full",
          rounded && "rounded-full",
          className,
        )}
        ref={ref}
        disabled={asChild ? undefined : disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {content}
      </Comp>
    );
  },
);
Button.displayName = "Button";

type IconButtonProps = Omit<ButtonProps, "size" | "children"> & {
  "aria-label": string;
  children: React.ReactNode;
  iconSize?: "lg" | "default" | "sm" | "xs";
};

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ iconSize = "default", ...props }, ref) => {
    const sizeMap = {
      lg: "icon-lg",
      default: "icon",
      sm: "icon-sm",
      xs: "icon-xs",
    } as const;

    return <Button ref={ref} size={sizeMap[iconSize]} {...props} />;
  },
);
IconButton.displayName = "IconButton";

const ButtonGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex items-center [&>button:not(:first-child)]:-ml-px [&>button:not(:first-child)]:rounded-l-none [&>button:not(:last-child)]:rounded-r-none",
      className,
    )}
    {...props}
  />
));
ButtonGroup.displayName = "ButtonGroup";

export { Button, ButtonGroup, IconButton, buttonVariants };
