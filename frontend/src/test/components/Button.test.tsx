import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "../../components/common/Button";

describe("Button Component", () => {
  it("renders with default primary variant and accessible name", () => {
    render(<Button>Click Me</Button>);
    const button = screen.getByRole("button", { name: "Click Me" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-sky-600");
  });

  it("renders secondary, outline, and emergency variants with proper styles", () => {
    const { rerender } = render(
      <Button variant="secondary">Secondary Button</Button>
    );
    expect(screen.getByRole("button", { name: "Secondary Button" })).toHaveClass(
      "bg-slate-900"
    );

    rerender(<Button variant="outline">Outline Button</Button>);
    expect(screen.getByRole("button", { name: "Outline Button" })).toHaveClass(
      "border-slate-300"
    );

    rerender(<Button variant="emergency">Emergency Call</Button>);
    expect(screen.getByRole("button", { name: "Emergency Call" })).toHaveClass(
      "bg-amber-500"
    );
  });

  it("renders with different size styles while maintaining touch targets", () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button", { name: "Small" })).toHaveClass(
      "min-h-[38px]"
    );

    rerender(<Button size="md">Medium</Button>);
    expect(screen.getByRole("button", { name: "Medium" })).toHaveClass(
      "min-h-[44px]"
    );

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button", { name: "Large" })).toHaveClass(
      "min-h-[48px]"
    );
  });

  it("handles click events when active", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Submit</Button>);
    const button = screen.getByRole("button", { name: "Submit" });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("disables interaction and sets aria-disabled when disabled", () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled Button
      </Button>
    );
    const button = screen.getByRole("button", { name: "Disabled Button" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveClass("opacity-50", "cursor-not-allowed");

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("displays loading spinner, sets aria-busy, and blocks click when isLoading is true", () => {
    const handleClick = vi.fn();
    render(
      <Button isLoading loadingText="Submitting Request..." onClick={handleClick}>
        Submit
      </Button>
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Submitting Request...");

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("includes accessible focus indicators", () => {
    render(<Button>Focusable</Button>);
    const button = screen.getByRole("button", { name: "Focusable" });
    expect(button).toHaveClass("focus-visible:ring-2", "focus-visible:ring-offset-2");
  });

  it("renders as semantic anchor element when href is provided", () => {
    render(<Button href="tel:5551234567">Call Us</Button>);
    const link = screen.getByRole("link", { name: "Call Us" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "tel:5551234567");
  });

  it("handles disabled state when rendered as an anchor link", () => {
    const handleClick = vi.fn();
    render(
      <Button href="tel:5551234567" disabled onClick={handleClick}>
        Disabled Link
      </Button>
    );
    const link = screen.getByRole("link", { name: "Disabled Link" });
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).toHaveClass("pointer-events-none");

    fireEvent.click(link);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("renders icons on left and right without breaking text", () => {
    render(
      <Button
        leftIcon={<span data-testid="left-icon">Left</span>}
        rightIcon={<span data-testid="right-icon">Right</span>}
      >
        With Icons
      </Button>
    );
    expect(screen.getByTestId("left-icon")).toBeInTheDocument();
    expect(screen.getByTestId("right-icon")).toBeInTheDocument();
    expect(screen.getByText("With Icons")).toBeInTheDocument();
  });
});
