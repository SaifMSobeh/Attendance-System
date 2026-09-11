import React, { useEffect } from "react";

export default function Modal({ isOpen, onClose, title, children, maxWidth = 420 }) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="panel modal" style={{ maxWidth }}>
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  );
}
