import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "./index.css";
import App from "./app/App";
import { getConsent } from "./features/consent/consent";
import { initAnalytics } from "./lib/firebase";

if (getConsent() === "accepted") void initAnalytics();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
