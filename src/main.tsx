import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./ThemeContext";
import { ToastProvider } from "./ToastContext";
import Toast from "./Toast";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <App />
        <Toast />
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
