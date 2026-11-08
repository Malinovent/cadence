import React from "react";
import ReactDOM from "react-dom/client";
// Self-hosted fonts (offline). Fraunces keeps its optical-size axis via the opsz build;
// its family name is 'Fraunces Variable'. Spline Sans Mono: latin 400 and 500 only.
import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource/spline-sans-mono/latin-400.css";
import "@fontsource/spline-sans-mono/latin-500.css";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { I18nProvider } from "./i18n/I18nProvider";
import { applyTheme, readTheme } from "./state/themePrefs";

applyTheme(readTheme()); // before the first paint: no flash of the wrong look

// a crash shows the crash screen (weeks safe, download, reload) instead of a blank page
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
