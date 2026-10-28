import { Request, Response, NextFunction } from "express";
import {
  getPublicBusinessInfo,
  getBusinessSettings,
  updateBusinessSettings,
} from "./business.service.js";
import { updateBusinessSettingsSchema } from "./business.schema.js";

/**
 * Public endpoint: Retrieves company public contact details and availability notice.
 * Never returns internal dispatch email addresses, credentials, or internal IDs.
 */
export async function handleGetPublicBusinessInfo(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const info = await getPublicBusinessInfo();

    // Explicit allowlist: Exclude internal dispatchEmail, secrets, or internal IDs
    const publicData = {
      companyName: info.companyName,
      phone: info.phone,
      emergencyPhone: info.emergencyPhone,
      address: info.address,
      serviceAreas: info.serviceAreas,
      businessHours: info.businessHours,
      licenseNumber: info.licenseNumber,
      availability: info.availability,
    };

    res.status(200).json({
      success: true,
      data: publicData,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Authenticated endpoint: Retrieves complete business settings for owner/admin dashboard.
 */
export async function handleGetBusinessSettings(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const settings = await getBusinessSettings();

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Authenticated endpoint: Updates business settings, operating hours, and availability.
 * CSRF-protected and role-authorized (owner/admin only).
 */
export async function handleUpdateBusinessSettings(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validatedData = updateBusinessSettingsSchema.parse(req.body);
    const updatedSettings = await updateBusinessSettings(validatedData);

    res.status(200).json({
      success: true,
      data: updatedSettings,
      message: "Business settings updated successfully.",
    });
  } catch (error) {
    next(error);
  }
}
