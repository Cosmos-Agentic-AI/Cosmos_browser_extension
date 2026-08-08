import React from "react";
import ReactDOM from "react-dom/client";
import { OnboardingWizard } from "./OnboardingWizard";
import "@shared/styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <OnboardingWizard />
  </React.StrictMode>,
);
