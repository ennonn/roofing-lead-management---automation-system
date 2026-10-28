import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { PublicBusinessInfo } from "@roofing/shared-types";
import { branding } from "../config/branding";
import { fetchPublicBusinessInfo } from "../services/business.service";

const defaultBusinessInfo: PublicBusinessInfo = {
  companyName: branding.companyName,
  phone: branding.phone,
  emergencyPhone: branding.emergencyPhone,
  address: branding.address,
  serviceAreas: branding.serviceAreas,
  businessHours: branding.businessHours,
  licenseNumber: branding.licenseNumber,
  availability: {
    status: "available",
    noticeHeadline: null,
    noticeBody: null,
    reopenAt: null,
    autoResume: false,
    acceptQuotesWhenUnavailable: false,
    timezone: "America/New_York",
  },
};

interface BusinessInfoContextValue {
  businessInfo: PublicBusinessInfo;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  refreshBusinessInfo: () => Promise<void>;
}

const BusinessInfoContext = createContext<BusinessInfoContextValue>({
  businessInfo: defaultBusinessInfo,
  isLoading: false,
  error: null,
  reload: async () => {},
  refreshBusinessInfo: async () => {},
});

export const BusinessInfoProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [businessInfo, setBusinessInfo] = useState<PublicBusinessInfo>(defaultBusinessInfo);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPublicBusinessInfo();
      setBusinessInfo(data);
    } catch (err: unknown) {
      // Fallback gracefully to default branding config without crashing public site
      console.warn("[BusinessInfo] Using fallback branding configuration:", err);
      setError(err instanceof Error ? err.message : "Failed to load dynamic business info.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  return (
    <BusinessInfoContext.Provider
      value={{
        businessInfo,
        isLoading,
        error,
        reload: loadInfo,
        refreshBusinessInfo: loadInfo,
      }}
    >
      {children}
    </BusinessInfoContext.Provider>
  );
};

export function useBusinessInfo(): BusinessInfoContextValue {
  return useContext(BusinessInfoContext);
}
