import React from "react";

export default function StatCard({ label, value, coral = false }) {
  return (
    <div className="panel stat-card">
      <div className="label">{label}</div>
      <div className={`value ${coral ? "coral" : ""}`}>{value}</div>
    </div>
  );
}
