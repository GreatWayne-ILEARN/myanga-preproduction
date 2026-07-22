import React from "react";
import { createRoot } from "react-dom/client";
import App from "./myyanga-app.jsx";
import { registerReelServiceWorker } from "./lib/reelEngine.js";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

registerReelServiceWorker();
