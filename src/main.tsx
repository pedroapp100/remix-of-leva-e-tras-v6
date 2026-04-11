import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global error handlers — catch unhandled errors outside React tree
window.addEventListener("error", (event) => {
  console.error("[GlobalError]", event.error ?? event.message);
});
window.addEventListener("unhandledrejection", (event) => {
  console.error("[UnhandledPromise]", event.reason);
});

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(<App />);

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const boot = document.getElementById("app-boot");
    if (!boot) return;

    boot.style.opacity = "0";
    window.setTimeout(() => boot.remove(), 180);
  });
});
