import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import App from "./App";
import { Notifications } from "@mantine/notifications";
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { AppThemeProvider } from "./themes/ThemeContext";

const container = document.getElementById("root");

const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <AppThemeProvider>
      <Notifications />
      <App />
    </AppThemeProvider>
  </React.StrictMode>,
);
