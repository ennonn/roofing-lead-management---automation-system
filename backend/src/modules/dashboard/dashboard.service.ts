import { count, eq, gte, and, lt } from "drizzle-orm";
import { getDb, AppDatabase } from "../../db/index.js";
import { leads } from "../../db/schema.js";
import { DashboardStats, LeadStatus } from "@roofing/shared-types";

export class DashboardService {
  constructor(private db: AppDatabase = getDb()) {}

  /**
   * Calculates dashboard summary statistics directly from persistent PostgreSQL records.
   * Empty database returns genuine zero counts without fabricated data.
   */
  async getStats(): Promise<DashboardStats> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Total leads count
    const [totalResult] = await this.db.select({ value: count() }).from(leads);
    const totalLeads = Number(totalResult?.value || 0);

    // 2. Leads submitted in the last 30 days
    const [recentResult] = await this.db
      .select({ value: count() })
      .from(leads)
      .where(gte(leads.submissionDate, thirtyDaysAgo));
    const last30Days = Number(recentResult?.value || 0);

    // 3. Status breakdown
    const statusRows = await this.db
      .select({
        status: leads.status,
        count: count(),
      })
      .from(leads)
      .groupBy(leads.status);

    const statusCounts: Record<LeadStatus, number> = {
      new: 0,
      contacted: 0,
      estimate_scheduled: 0,
      won: 0,
      lost: 0,
    };

    for (const row of statusRows) {
      const s = row.status as LeadStatus;
      if (s in statusCounts) {
        statusCounts[s] = Number(row.count || 0);
      }
    }

    // 4. Urgent attention count: new leads awaiting follow-up for > 24 hours
    const [urgentResult] = await this.db
      .select({ value: count() })
      .from(leads)
      .where(and(eq(leads.status, "new"), lt(leads.submissionDate, twentyFourHoursAgo)));
    const urgentAttentionCount = Number(urgentResult?.value || 0);

    // 5. Conversion rate (% of won leads over total leads)
    const conversionRate =
      totalLeads > 0
        ? Number(((statusCounts.won / totalLeads) * 100).toFixed(1))
        : 0;

    return {
      totalLeads,
      last30Days,
      conversionRate,
      statusCounts,
      urgentAttentionCount,
    };
  }
}
