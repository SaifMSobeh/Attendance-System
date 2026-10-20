import React, { useEffect, useState } from "react";

export default function Sidebar({
  title,
  navItems = [],
  activeId,
  onSelect,
  onChangePassword,
  onLogout,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  const selectItem = (itemId) => {
    onSelect?.(itemId);
    setMenuOpen(false);
  };

  return (
    <>
      <header className="mobile-menu-bar">
        <button
          type="button"
          className="mobile-menu-button"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className={`hamburger-icon ${menuOpen ? "open" : ""}`} aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
        <div className="mobile-menu-brand">
          <span className="dot"></span> HOSSAM MATH
        </div>
        <span className="mobile-menu-account">{title}</span>
      </header>
      {menuOpen && (
        <button
          type="button"
          className="mobile-nav-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        id="primary-navigation"
        className={`sidebar ${menuOpen ? "mobile-open" : ""}`}
        aria-label="Main navigation"
      >
        <div className="mobile-sidebar-header">
          <div className="sidebar-brand">
            <span className="dot"></span> HOSSAM MATH
          </div>
          <button
            type="button"
            className="mobile-menu-close"
            aria-label="Close navigation menu"
            onClick={() => setMenuOpen(false)}
          >
            ×
          </button>
        </div>
      <div className="sidebar-brand desktop-sidebar-brand">
        <span className="dot"></span> HOSSAM MATH
      </div>
      <div className="sidebar-name">{title}</div>

      {navItems.map((item) => (
        <button
          type="button"
          key={item.id}
          className={`nav-item ${activeId === item.id ? "active" : ""}`}
          aria-current={activeId === item.id ? "page" : undefined}
          onClick={() => selectItem(item.id)}
        >
          {item.label}
        </button>
      ))}

      <div className="sidebar-footer">
        <button
          type="button"
          className="btn"
          style={{ width: "100%", marginBottom: "8px" }}
          onClick={() => {
            onChangePassword?.();
            setMenuOpen(false);
          }}
        >
          Change password
        </button>
        <button
          type="button"
          className="btn"
          style={{ width: "100%" }}
          onClick={() => {
            setMenuOpen(false);
            onLogout?.();
          }}
        >
          Sign out
        </button>
      </div>
      </aside>
    </>
  );
}
