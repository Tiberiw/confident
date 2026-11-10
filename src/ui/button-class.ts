import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-surface hover:bg-brand-hover",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-page",
  danger: "border border-line-strong bg-surface text-danger hover:border-danger/40 hover:bg-danger-soft",
  ghost: "text-muted hover:bg-page hover:text-ink",
};

const sizes = { sm: "h-8 px-2.5 text-sm", md: "h-9 px-3.5 text-sm" };

/** Shared look for buttons and button-styled links. */
export const buttonClass = (variant: ButtonVariant = "primary", size: "sm" | "md" = "md", className?: string) =>
  cx(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1",
    "disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
