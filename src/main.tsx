// Polyfill for crypto.randomUUID (no dependencies)
if (!globalThis.crypto) {
    // @ts-ignore
    globalThis.crypto = {};
  }
  
  if (!globalThis.crypto.randomUUID) {
    // @ts-ignore
    globalThis.crypto.randomUUID = () => {
      const bytes = new Uint8Array(16);
      globalThis.crypto.getRandomValues(bytes);
  
      // RFC 4122 v4
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
  
      const hex = [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    };
  }
  
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
