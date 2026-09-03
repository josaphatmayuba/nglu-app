import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app.jsx";
import { bootstrapAuth } from "./auth.jsx";
import "./styles/app.css";

bootstrapAuth().then(() => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode><App /></React.StrictMode>
  );
});
