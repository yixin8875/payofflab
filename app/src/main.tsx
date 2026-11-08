import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import "@fontsource-variable/inter";
import "@fontsource-variable/geist-mono";
import "./styles.css";
import App from "./App";

/**
 * The boot screen lives in index.html so it paints before the bundle loads.
 * Fade it out once React has committed its first frame, then drop the node.
 */
function BootDismiss() {
  useEffect(() => {
    const boot = document.getElementById("boot");
    if (!boot) return;
    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      boot.classList.add("is-ready");
      window.setTimeout(() => boot.remove(), 460);
    };
    // Prefer the frame after the first paint; the timer is a fallback for
    // occluded windows, where requestAnimationFrame may be throttled.
    const frame = window.requestAnimationFrame(dismiss);
    const timer = window.setTimeout(dismiss, 120);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);
  return null;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BootDismiss />
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
