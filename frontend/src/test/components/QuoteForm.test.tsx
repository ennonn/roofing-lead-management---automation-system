import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuoteForm } from "../../components/forms/QuoteForm";

describe("QuoteForm Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders all required form fields, labels, and accessible attributes", () => {
    render(<QuoteForm />);

    expect(
      screen.getByRole("heading", { level: 2, name: /Request an On-Site Roofing Quote/i })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Service Requested/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Property Address & City/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Project Notes & Symptoms/i)
    ).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", {
      name: /Request Free Quote & Inspection/i,
    });
    expect(submitBtn).toBeInTheDocument();
  });

  it("validates required fields and displays accessible error messages when submitted empty", async () => {
    render(<QuoteForm />);

    const submitBtn = screen.getByRole("button", {
      name: /Request Free Quote & Inspection/i,
    });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText("Customer name is required")
    ).toBeInTheDocument();
    expect(screen.getByText("Phone number is required")).toBeInTheDocument();
    expect(screen.getByText("Email address is required")).toBeInTheDocument();
    expect(screen.getByText("Service type is required")).toBeInTheDocument();
    expect(
      screen.getByText("Property location/address is required")
    ).toBeInTheDocument();

    // Verify accessible error association
    const nameInput = screen.getByLabelText(/Full Name/i);
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    expect(nameInput).toHaveAttribute("aria-describedby", "customerName-error");

    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBeGreaterThanOrEqual(1);
  });

  it("validates input formats: minimum length, phone format, and email address", async () => {
    render(<QuoteForm />);

    // Name too short (< 2)
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { name: "customerName", value: "J" },
    });
    // Invalid phone characters
    fireEvent.change(screen.getByLabelText(/Phone Number/i), {
      target: { name: "phone", value: "abc-no-digits" },
    });
    // Invalid email format
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { name: "email", value: "invalid-email" },
    });
    // Valid service and location
    fireEvent.change(screen.getByLabelText(/Service Requested/i), {
      target: { name: "serviceType", value: "Roof Replacement" },
    });
    fireEvent.change(screen.getByLabelText(/Property Address & City/i), {
      target: { name: "propertyLocation", value: "123 Elm St" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Request Free Quote & Inspection/i })
    );

    expect(
      await screen.findByText("Name must be at least 2 characters")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Please enter a valid phone number")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Please provide a valid email address")
    ).toBeInTheDocument();
  });

  it("renders non-visible, non-interactive honeypot trap field", () => {
    const { container } = render(<QuoteForm />);

    const hpInput = container.querySelector(
      'input[name="_hp"]'
    ) as HTMLInputElement;
    expect(hpInput).toBeInTheDocument();
    expect(hpInput).toHaveAttribute("tabindex", "-1");
    expect(hpInput).toHaveAttribute("autocomplete", "off");

    const hpWrapper = hpInput.closest('div[style*="display: none"]');
    expect(hpWrapper).toBeInTheDocument();
    expect(hpWrapper).toHaveAttribute("aria-hidden", "true");
  });

  it("handles successful submission (HTTP 201) and displays confirmation state", async () => {
    const mockSuccessResponse = {
      success: true,
      data: {
        leadId: "lead-abc-12345",
        status: "new",
        submissionDate: new Date().toISOString(),
      },
      message: "Thank you! Your quote request has been received.",
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => mockSuccessResponse,
    } as Response);

    const handleSuccess = vi.fn();
    render(<QuoteForm onSuccess={handleSuccess} />);

    // Fill valid form fields
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { name: "customerName", value: "Sarah Connor" },
    });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), {
      target: { name: "phone", value: "(555) 789-0123" },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { name: "email", value: "sarah@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Service Requested/i), {
      target: { name: "serviceType", value: "Roof Replacement" },
    });
    fireEvent.change(screen.getByLabelText(/Property Address & City/i), {
      target: { name: "propertyLocation", value: "456 Oak Ave, Metro Area" },
    });
    fireEvent.change(screen.getByLabelText(/Project Notes & Symptoms/i), {
      target: {
        name: "projectDescription",
        value: "Hail storm caused visible damage on north-facing slope.",
      },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Request Free Quote & Inspection/i })
    );

    // Verify fetch call payload
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    const [calledUrl, calledOptions] = fetchSpy.mock.calls[0];
    expect(calledUrl).toContain("/leads");
    expect(calledOptions?.method).toBe("POST");

    const sentBody = JSON.parse(calledOptions?.body as string);
    expect(sentBody.customerName).toBe("Sarah Connor");
    expect(sentBody.phone).toBe("(555) 789-0123");
    expect(sentBody.email).toBe("sarah@example.com");
    expect(sentBody.serviceType).toBe("Roof Replacement");
    expect(sentBody.propertyLocation).toBe("456 Oak Ave, Metro Area");
    expect(sentBody.preferredContactMethod).toBe("phone");
    expect(sentBody._hp).toBe("");

    // Verify confirmation view is displayed
    expect(
      await screen.findByRole("heading", {
        level: 3,
        name: "Quote Request Received!",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Sarah Connor")).toBeInTheDocument();
    expect(screen.getByText("Roof Replacement")).toBeInTheDocument();
    expect(screen.getByTitle("lead-abc-12345")).toBeInTheDocument();
    expect(handleSuccess).toHaveBeenCalledWith(mockSuccessResponse.data);

    // Can reset form to submit another
    fireEvent.click(
      screen.getByRole("button", { name: /Submit Another Project/i })
    );
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /Request an On-Site Roofing Quote/i,
      })
    ).toBeInTheDocument();
  });

  it("handles backend validation errors (HTTP 422) and preserves user-entered data", async () => {
    const mockValidationError = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "One or more input fields are invalid.",
        details: [
          {
            field: "phone",
            message: "Phone number is already associated with an active dispatch",
          },
        ],
      },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => mockValidationError,
    } as Response);

    render(<QuoteForm />);

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { name: "customerName", value: "Robert Davis" },
    });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), {
      target: { name: "phone", value: "(555) 555-5555" },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { name: "email", value: "robert@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Service Requested/i), {
      target: { name: "serviceType", value: "Roof Repair" },
    });
    fireEvent.change(screen.getByLabelText(/Property Address & City/i), {
      target: { name: "propertyLocation", value: "789 Pine Rd" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Request Free Quote & Inspection/i })
    );

    // Inline error mapped from server details
    expect(
      await screen.findByText(
        "Phone number is already associated with an active dispatch"
      )
    ).toBeInTheDocument();

    // Data is preserved
    expect(screen.getByLabelText(/Full Name/i)).toHaveValue("Robert Davis");
    expect(screen.getByLabelText(/Email Address/i)).toHaveValue("robert@example.com");
  });

  it("handles rate limiting (HTTP 429) gracefully without clearing inputs", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message:
            "Too many quote requests from this IP. Please wait a few minutes before trying again.",
        },
      }),
    } as Response);

    render(<QuoteForm />);

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { name: "customerName", value: "Alice Walker" },
    });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), {
      target: { name: "phone", value: "(555) 111-2222" },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { name: "email", value: "alice@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Service Requested/i), {
      target: { name: "serviceType", value: "Roof Inspection & Maintenance" },
    });
    fireEvent.change(screen.getByLabelText(/Property Address & City/i), {
      target: { name: "propertyLocation", value: "321 Cedar St" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Request Free Quote & Inspection/i })
    );

    expect(
      await screen.findByText(/Too many quote requests from this IP/i)
    ).toBeInTheDocument();

    // Preserved inputs
    expect(screen.getByLabelText(/Full Name/i)).toHaveValue("Alice Walker");
  });

  it("handles server errors (HTTP 500) gracefully without leaking stack traces", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred. Please try again later.",
        },
      }),
    } as Response);

    render(<QuoteForm />);

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { name: "customerName", value: "John Smith" },
    });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), {
      target: { name: "phone", value: "(555) 444-5555" },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { name: "email", value: "john@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Service Requested/i), {
      target: { name: "serviceType", value: "Storm & Hail Damage Restoration" },
    });
    fireEvent.change(screen.getByLabelText(/Property Address & City/i), {
      target: { name: "propertyLocation", value: "999 Oak Way" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Request Free Quote & Inspection/i })
    );

    expect(
      await screen.findByText(/An unexpected error occurred/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toHaveValue("John Smith");
  });

  it("handles network connection failure gracefully and preserves inputs", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new TypeError("Failed to fetch")
    );

    render(<QuoteForm />);

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { name: "customerName", value: "Michael Scott" },
    });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), {
      target: { name: "phone", value: "(555) 666-7777" },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { name: "email", value: "michael@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Service Requested/i), {
      target: { name: "serviceType", value: "Roof Repair" },
    });
    fireEvent.change(screen.getByLabelText(/Property Address & City/i), {
      target: { name: "propertyLocation", value: "1725 Slough Ave" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Request Free Quote & Inspection/i })
    );

    expect(
      await screen.findByText(/Unable to connect to the server/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toHaveValue("Michael Scott");
  });

  it("displays loading state and prevents repeated clicks while in-flight", async () => {
    let resolvePromise: (value: Response) => void;
    const pendingPromise = new Promise<Response>((resolve) => {
      resolvePromise = resolve;
    });

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockReturnValueOnce(pendingPromise);

    render(<QuoteForm />);

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { name: "customerName", value: "Pam Beesly" },
    });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), {
      target: { name: "phone", value: "(555) 888-9999" },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { name: "email", value: "pam@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Service Requested/i), {
      target: { name: "serviceType", value: "Roof Replacement" },
    });
    fireEvent.change(screen.getByLabelText(/Property Address & City/i), {
      target: { name: "propertyLocation", value: "42 Wallaby Way" },
    });

    const submitBtn = screen.getByRole("button", {
      name: /Request Free Quote & Inspection/i,
    });
    fireEvent.click(submitBtn);

    // While in-flight:
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Submitting Quote Request..."
      );
    });

    expect(screen.getByLabelText(/Full Name/i)).toBeDisabled();

    // Secondary click attempt should NOT trigger another fetch
    fireEvent.click(submitBtn);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Resolve the promise to finish
    resolvePromise!({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        data: {
          leadId: "lead-final-1",
          status: "new",
          submissionDate: new Date().toISOString(),
        },
      }),
    } as Response);

    await waitFor(() => {
      expect(screen.getByText("Quote Request Received!")).toBeInTheDocument();
    });
  });
});
