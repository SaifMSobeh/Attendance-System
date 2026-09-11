import React from "react";

export default function Sidebar({
  title,
  navItems = [],
  activeId,
  onSelect,
  onChangePassword,
  onLogout,
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="dot"></span> HOSSAM MATH
      </div>
      <div className="sidebar-name">{title}</div>

      {navItems.map((item) => (
        <div
          key={item.id}
          className={`nav-item ${activeId === item.id ? "active" : ""}`}
          onClick={() => onSelect && onSelect(item.id)}
        >
          {item.label}
        </div>
      ))}

      <div className="sidebar-footer">
        <button
          className="btn"
          style={{ width: "100%", marginBottom: "8px" }}
          onClick={onChangePassword}
        >
          Change password
        </button>
        <button
          className="btn"
          style={{ width: "100%" }}
          onClick={onLogout}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
