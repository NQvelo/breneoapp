import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

type SliderVariant = "default" | "salary";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
    variant?: SliderVariant;
  }
>(({ className, variant = "default", ...props }, ref) => {
  const value = props.value || props.defaultValue || [0];
  const thumbCount = Array.isArray(value) ? value.length : 1;
  const isSalary = variant === "salary";

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        className={cn(
          "relative w-full grow overflow-hidden rounded-full",
          isSalary
            ? "h-1 bg-gray-200 dark:bg-gray-700"
            : "h-2 bg-gray-200 dark:bg-gray-700",
        )}
      >
        <SliderPrimitive.Range
          className={cn(
            "absolute h-full",
            isSalary
              ? "bg-[#333333] dark:bg-gray-200"
              : "bg-breneo-blue dark:bg-breneo-blue",
          )}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbCount }).map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          className={cn(
            "block rounded-full transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
            isSalary
              ? "h-4 w-4 border-0 bg-[#333333] shadow-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 dark:bg-gray-200"
              : "h-5 w-5 border-2 border-breneo-blue bg-white ring-offset-background focus-visible:ring-2 focus-visible:ring-breneo-blue focus-visible:ring-offset-2 dark:border-breneo-blue dark:bg-gray-800",
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
