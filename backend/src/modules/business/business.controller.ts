import { Request, Response, NextFunction } from "express";
import { getPublicBusinessInfo } from "./business.service.js";

export async function handleGetPublicBusinessInfo(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const info = await getPublicBusinessInfo();
    res.status(200).json({
      success: true,
      data: info,
    });
  } catch (error) {
    next(error);
  }
}
