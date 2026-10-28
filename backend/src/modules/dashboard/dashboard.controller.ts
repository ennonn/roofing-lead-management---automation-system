import { Request, Response, NextFunction } from "express";
import { DashboardService } from "./dashboard.service.js";

export class DashboardController {
  constructor(private dashboardService: DashboardService = new DashboardService()) {}

  handleGetStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.dashboardService.getStats();
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };
}
