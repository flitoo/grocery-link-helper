import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { preloadInitialRoute } from './lib/routeLoading';

function renderApp() {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  );
}

// Load only the current page before the first render. Other pages stay lazy.
// On failure, render normally so React handles the rejected route import.
preloadInitialRoute(window.location.pathname).then(renderApp, renderApp);
