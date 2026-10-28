import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { getDb, AppDatabase } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { AuthUser, UserRole } from "@roofing/shared-types";

// Pre-computed bcrypt hash used for constant-time comparison when user does not exist
// to prevent username/email enumeration via timing side-channels
const DUMMY_HASH = "$2a$12$e80yqV4G1pMh/H6J0bTqU.3yW5/c8aQ7VjE1L0rN1h0uE2p3G4H5K";

export class AuthService {
  constructor(private db: AppDatabase = getDb()) {}

  /**
   * Verifies user credentials securely.
   * Normalizes email, uses timing-safe comparison, and returns generic null on any failure.
   */
  async authenticate(email: string, plainPassword: string): Promise<AuthUser | null> {
    const normalizedEmail = email.toLowerCase().trim();

    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        fullName: users.fullName,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(and(eq(users.email, normalizedEmail), eq(users.isActive, true)))
      .limit(1);

    if (!user) {
      // Execute timing-safe dummy compare to eliminate response time disparity
      await bcrypt.compare(plainPassword, DUMMY_HASH);
      return null;
    }

    const isMatch = await bcrypt.compare(plainPassword, user.passwordHash);
    if (!isMatch) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as UserRole,
    };
  }

  async findUserById(id: string): Promise<AuthUser | null> {
    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(and(eq(users.id, id), eq(users.isActive, true)))
      .limit(1);

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as UserRole,
    };
  }
}
