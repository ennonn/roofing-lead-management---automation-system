import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "emergency";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  href?: string;
  target?: string;
  rel?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-sky-600 text-white hover:bg-sky-700 active:bg-sky-800 focus-visible:ring-sky-500 shadow-sm border border-transparent",
  secondary:
    "bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 focus-visible:ring-slate-400 shadow-sm border border-transparent",
  outline:
    "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 focus-visible:ring-sky-500 shadow-sm",
  emergency:
    "bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 active:bg-amber-600 focus-visible:ring-amber-500 shadow-md hover:shadow-lg border border-amber-600",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3.5 py-1.5 text-sm min-h-[38px] gap-1.5 rounded-md",
  md: "px-5 py-2.5 text-base font-medium min-h-[44px] gap-2 rounded-lg",
  lg: "px-6 py-3.5 text-lg font-semibold min-h-[48px] gap-2.5 rounded-lg",
};

export const Button = React.forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ButtonProps
>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      href,
      disabled,
      className = "",
      children,
      type = "button",
      onClick,
      ...props
    },
    ref
  ) => {
    const isInteractiveDisabled = Boolean(disabled || isLoading);

    const baseClasses =
      "inline-flex items-center justify-center font-medium transition-colors select-none " +
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

    const combinedClasses = [
      baseClasses,
      variantStyles[variant],
      sizeStyles[size],
      fullWidth ? "w-full" : "",
      isInteractiveDisabled ? "opacity-50 cursor-not-allowed" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const content = (
      <>
        {isLoading ? (
          <span
            className="inline-flex items-center gap-2"
            role="status"
            aria-live="polite"
          >
            <Loader2
              className="h-4 w-4 motion-safe:animate-spin"
              aria-hidden="true"
            />
            <span>{loadingText || children || "Loading..."}</span>
          </span>
        ) : (
          <>
            {leftIcon && (
              <span className="inline-flex shrink-0" aria-hidden="true">
                {leftIcon}
              </span>
            )}
            <span>{children}</span>
            {rightIcon && (
              <span className="inline-flex shrink-0" aria-hidden="true">
                {rightIcon}
              </span>
            )}
          </>
        )}
      </>
    );

    // If an href is supplied, render as an anchor tag for semantic links (e.g., tel: links)
    if (href) {
      if (isInteractiveDisabled) {
        return (
          <a
            ref={ref as React.ForwardedRef<HTMLAnchorElement>}
            role="link"
            aria-disabled="true"
            tabIndex={-1}
            className={`${combinedClasses} pointer-events-none`}
            onClick={(e) => e.preventDefault()}
            {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
          >
            {content}
          </a>
        );
      }

      return (
        <a
          ref={ref as React.ForwardedRef<HTMLAnchorElement>}
          href={href}
          className={combinedClasses}
          onClick={onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        ref={ref as React.ForwardedRef<HTMLButtonElement>}
        type={type}
        disabled={isInteractiveDisabled}
        aria-busy={isLoading ? "true" : undefined}
        aria-disabled={isInteractiveDisabled ? "true" : undefined}
        className={combinedClasses}
        onClick={onClick}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = "Button";
