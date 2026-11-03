import React from "react";
import ReactDOM from "react-dom/client";
// Self-hosted fonts (offline). Fraunces keeps its optical-size axis via the opsz build;
// its family name is 'Fraunces Variable'. Spline Sans Mono: latin 400 and 500 only.
import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource/spline-sans-mono/latin-400.css";
import "@fontsource/spline-sans-mono/latin-500.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
