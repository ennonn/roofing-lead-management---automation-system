import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../routes/AppRoutes";

describe("Public Route Rendering & Navigation Shells", () => {
  const renderRoute = (initialPath: string) => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <AppRoutes skipInitialCheck={true} />
      </MemoryRouter>
    );
  };

  it("renders the Home page route (/) with valid heading and layout", () => {
    renderRoute("/");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Roofing Built to Protect What Matters Most/i
    );
    expect(screen.getByRole("banner")).toBeInTheDocument(); // Header/Navbar
    expect(screen.getByRole("contentinfo")).toBeInTheDocument(); // Footer
  });

  it("renders the Services page route (/services) with valid heading", () => {
    renderRoute("/services");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Engineered for Weather Durability & Long-Term Protection/i
    );
  });

  it("renders the About Us page route (/about) with valid heading", () => {
    renderRoute("/about");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Craftsmanship, Transparency & Uncompromising Protection/i
    );
  });

  it("renders the Service Areas page route (/service-areas) with valid heading", () => {
    renderRoute("/service-areas");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Areas We Proudly Serve/i
    );
  });

  it("renders the Contact / Quote page route (/contact) with valid heading", () => {
    renderRoute("/contact");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Get in Touch With Our Roofing Team/i
    );
  });

  it("renders the Privacy Policy page route (/privacy) with valid heading", () => {
    renderRoute("/privacy");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Privacy Policy & Lead Commitment/i
    );
  });

  it("renders deliberate 404 Not Found route on unknown URL (/random-missing-page)", () => {
    renderRoute("/random-missing-page");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Page Not Found/i);
    expect(screen.getByText(/404/i)).toBeInTheDocument();
  });
});
