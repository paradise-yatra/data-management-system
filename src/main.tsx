import React from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML = "<div style='padding:20px;font-family:sans-serif'>Root element #root not found.</div>";
  throw new Error("Root element #root not found. Check index.html.");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderError(message: string, detail?: unknown): void {
  const safeMessage = escapeHtml(message);
  const safeDetail = detail != null ? escapeHtml(String(detail)) : "";
  rootEl.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0a;color:#fafafa;font-family:system-ui,sans-serif;padding:24px;box-sizing:border-box">
      <div style="max-width:480px;text-align:center">
        <h1 style="font-size:1.25rem;margin-bottom:8px">Failed to load app</h1>
        <p style="color:#a1a1aa;margin-bottom:16px">${safeMessage}</p>
        <pre style="text-align:left;background:#27272a;padding:12px;border-radius:8px;overflow:auto;font-size:12px;margin-bottom:16px">${safeDetail}</pre>
        <button onclick="location.reload()" style="background:#fafafa;color:#0a0a0a;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:500">Reload</button>
      </div>
    </div>
  `;
}

async function bootstrap(): Promise<void> {
  try {
    const { default: App } = await import("./App.tsx");
    const root = createRoot(rootEl);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (err) {
    console.error("App bootstrap error:", err);
    renderError(
      err instanceof Error ? err.message : "An error occurred while loading the app.",
      err instanceof Error ? err.stack : err
    );
  }
}

bootstrap();
