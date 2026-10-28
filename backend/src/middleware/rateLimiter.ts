import rateLimit from "express-rate-limit";

// Rate limiter for public quote submissions: max 5 requests per 10 minutes per IP
export const leadSubmissionRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many quote requests from this IP. Please wait a few minutes before trying again.",
    },
  },
});

// General API rate limiter
export const generalApiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please try again later.",
    },
  },
});

// Strict rate limiter for authentication endpoints (prevent brute-force password guessing)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: {
    success: false,
    error: {
      code: "AUTH_RATE_LIMIT_EXCEEDED",
      message: "Too many login attempts. Please wait 15 minutes before trying again.",
    },
  },
});
