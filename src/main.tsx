import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import App from "./App.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Toaster
      toastOptions={{
        duration: 5000,
        style: {
          fontSize: "16px",
        },
      }}
    />
  </React.StrictMode>,
);
