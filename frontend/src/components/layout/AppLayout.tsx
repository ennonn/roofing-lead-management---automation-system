import React from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { ChatbotWidget } from "../chat/ChatbotWidget";
import { AvailabilityNoticeBanner } from "../common/AvailabilityNoticeBanner";
import { useBusinessInfo } from "../../context/BusinessInfoContext";

export const AppLayout: React.FC = () => {
  const { businessInfo } = useBusinessInfo();

  return (
    <div className="flex flex-col min-h-screen">
      <AvailabilityNoticeBanner
        availability={businessInfo?.availability}
        emergencyPhone={businessInfo?.emergencyPhone}
        companyPhone={businessInfo?.phone}
      />
      <Navbar />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ChatbotWidget />
    </div>
  );
};
