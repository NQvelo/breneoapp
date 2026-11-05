import * as React from "react";
import { Switch as GlisseSwitch, type SwitchProps } from "glisse";
import { useTheme } from "next-themes";

const ON_COLOR_STYLE = {
  "--lg-on": "hsl(var(--primary))",
} as React.CSSProperties;

/** Glisse Liquid Glass switch, themed to follow the app's class-based dark mode. */
const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ style, ...props }, ref) => {
    const { resolvedTheme } = useTheme();
    return (
      <GlisseSwitch
        ref={ref}
        data-theme={resolvedTheme === "dark" ? "dark" : "light"}
        style={{ ...ON_COLOR_STYLE, ...style }}
        {...props}
      />
    );
  },
);
Switch.displayName = "Switch";

export { Switch };
