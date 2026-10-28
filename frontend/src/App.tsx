import React from "react";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./routes/AppRoutes";
import { BusinessInfoProvider } from "./context/BusinessInfoContext";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <BusinessInfoProvider>
        <AppRoutes />
      </BusinessInfoProvider>
    </BrowserRouter>
  );
};

export default App;
