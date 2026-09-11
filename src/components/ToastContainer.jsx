import React from "react";
import { useToast } from "../context/ToastContext";

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        zIndex: 100,
        maxWidth: 320,
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.ok ? "ok" : "err"}`}
          style={{ position: "static", cursor: "pointer" }}
          onClick={() => removeToast(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
