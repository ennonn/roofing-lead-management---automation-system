import React from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { AppLayout } from "../components/layout/AppLayout";
import { HomePage } from "../pages/HomePage";
import { ServicesPage } from "../pages/ServicesPage";
import { AboutPage } from "../pages/AboutPage";
import { ServiceAreasPage } from "../pages/ServiceAreasPage";
import { ContactPage } from "../pages/ContactPage";
import { PrivacyPage } from "../pages/PrivacyPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { LoginPage } from "../pages/LoginPage";
import { DashboardLayout } from "../components/dashboard/DashboardLayout";
import { DashboardOverviewPage } from "../pages/DashboardOverviewPage";
import { LeadsListPage } from "../pages/LeadsListPage";
import { LeadDetailPage } from "../pages/LeadDetailPage";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";

export interface AppRoutesProps {
  skipInitialCheck?: boolean;
  initialUser?: any;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({
  skipInitialCheck,
  initialUser,
}) => {
  return (
    <AuthProvider skipInitialCheck={skipInitialCheck} initialUser={initialUser}>
      <Routes>
        {/* Public Pages */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="service-areas" element={<ServiceAreasPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
        </Route>

        {/* Owner Authentication */}
        <Route path="/login" element={<LoginPage />} />

        {/* Private Authenticated Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardOverviewPage />} />
          <Route path="leads" element={<LeadsListPage />} />
          <Route path="leads/:id" element={<LeadDetailPage />} />
        </Route>

        {/* Catch-all Not Found */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
};
