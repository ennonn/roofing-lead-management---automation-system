import React, { useState, useEffect, FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Lock, Mail, AlertCircle, ArrowLeft, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { branding } from "../config/branding";

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to dashboard or intended destination
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const destination = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/dashboard";
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login({
        email: email.trim(),
        password,
      });
      // Navigation is triggered by the useEffect when isAuthenticated transitions to true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed.";
      setLoginError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100 selection:bg-amber-500 selection:text-slate-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Return to Public Website */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-amber-400 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 rounded px-1 py-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to public website</span>
          </Link>
        </div>

        {/* Company Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 mb-4 shadow-lg shadow-amber-500/20">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Owner Dashboard Portal
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {branding.companyName}
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700/80 py-8 px-6 sm:px-10 shadow-2xl rounded-2xl">
          {/* Error Banner */}
          {loginError && (
            <div
              className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-800/50 flex items-start gap-3 text-red-200 text-sm"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{loginError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-200 mb-1.5"
              >
                Owner Email Address
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  disabled={isSubmitting}
                  placeholder="owner@example.com"
                  className={`block w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors ${
                    fieldErrors.email
                      ? "border-red-500 focus:border-red-500"
                      : "border-slate-700 focus:border-amber-500"
                  }`}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                />
              </div>
              {fieldErrors.email && (
                <p id="email-error" className="mt-1.5 text-xs text-red-400 font-medium">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-200 mb-1.5"
              >
                Password
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  disabled={isSubmitting}
                  placeholder="••••••••••••"
                  className={`block w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors ${
                    fieldErrors.password
                      ? "border-red-500 focus:border-red-500"
                      : "border-slate-700 focus:border-amber-500"
                  }`}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                />
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="mt-1.5 text-xs text-red-400 font-medium">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-amber-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </span>
                ) : (
                  <span>Sign In to Dashboard</span>
                )}
              </button>
            </div>
          </form>

          {/* Security Notice */}
          <div className="mt-6 pt-6 border-t border-slate-700/60 text-center text-xs text-slate-400">
            <p>
              Protected by server-managed secure sessions and automated rate limiting. Public registration is closed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
