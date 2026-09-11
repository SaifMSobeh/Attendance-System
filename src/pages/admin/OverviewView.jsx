import React, { useState, useEffect } from "react";
import StatCard from "../../components/StatCard";
import { api } from "../../api";
import { useToast } from "../../context/ToastContext";

export default function OverviewView({ onSelectStudent }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const data = await api("/students");
        setStudents(data);
      } catch (err) {
        toast(err.message, false);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [toast]);

  if (loading) {
    return <div className="empty-state">Loading overview…</div>;
  }

  const total = students.length;
  const avgAttendance =
    total === 0
      ? 0
      : Math.round(
          students.reduce((sum, s) => sum + (s.attendance_rate ?? 0), 0) / total
        );
  const unpaid = students.filter((s) => !s.paid_this_month).length;

  return (
    <section className="view">
      <div className="page-header">
        <div>
          <h2>Overview</h2>
          <div className="sub">Everyone, at a glance.</div>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="Total students" value={total} />
        <StatCard label="Average attendance" value={`${avgAttendance}%`} />
        <StatCard
          label="Unpaid this month"
          value={unpaid}
          coral={unpaid > 0}
        />
      </div>

      <div className="panel card">
        <div className="card-header">
          <h3>All students</h3>
        </div>
        {students.length === 0 ? (
          <div className="empty-state">
            No students yet. Add one from the Students tab.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Group</th>
                <th>Attendance</th>
                <th>This month</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr
                  key={s.id}
                  className="student-row"
                  style={{ cursor: "pointer" }}
                  onClick={() => onSelectStudent(s.id)}
                >
                  <td>{s.name}</td>
                  <td className="muted">{s.group_name || "—"}</td>
                  <td className="mono">
                    {s.attendance_rate === null ? "—" : `${s.attendance_rate}%`}
                  </td>
                  <td>
                    <span
                      className={`pill pill-${
                        s.paid_this_month ? "paid" : "unpaid"
                      }`}
                    >
                      {s.paid_this_month ? "paid" : "unpaid"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
