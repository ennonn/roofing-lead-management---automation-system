import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AuthService } from "./auth.service.js";
import { env } from "../../config/env.js";

const loginSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export class AuthController {
  constructor(private authService: AuthService = new AuthService()) {}

  handleLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Validate request body
      const parseResult = loginSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid login submission format.",
            details: parseResult.error.errors.map((err) => ({
              field: err.path.join("."),
              message: err.message,
            })),
          },
        });
        return;
      }

      const { email, password } = parseResult.data;

      // 2. Authenticate credentials (timing-safe)
      const user = await this.authService.authenticate(email, password);
      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password.",
          },
        });
        return;
      }

      // 3. Regenerate session to defend against session fixation attacks
      req.session.regenerate((regenErr) => {
        if (regenErr) {
          return next(regenErr);
        }

        // 4. Attach authenticated user details to new session
        req.session.userId = user.id;
        req.session.user = user;

        req.session.save((saveErr) => {
          if (saveErr) {
            return next(saveErr);
          }

          res.status(200).json({
            success: true,
            data: {
              user,
            },
            message: "Authentication successful.",
          });
        });
      });
    } catch (error) {
      next(error);
    }
  };

  handleLogout = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session) {
      res.status(200).json({
        success: true,
        data: null,
        message: "Session already terminated.",
      });
      return;
    }

    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }

      // Clear the session cookie on the client browser
      res.clearCookie(env.SESSION_NAME, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: env.COOKIE_SECURE || env.NODE_ENV === "production",
      });

      res.status(200).json({
        success: true,
        data: null,
        message: "Logged out successfully.",
      });
    });
  };

  handleGetSession = (req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  };
}
