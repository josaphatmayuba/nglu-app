import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app.jsx";
import { bootstrapAuth } from "./auth.jsx";
import "./styles.css";

bootstrapAuth().finally(() => {
  createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
