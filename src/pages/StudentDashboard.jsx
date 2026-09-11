import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import ChangePasswordModal from "../components/ChangePasswordModal";
import { api, MONTH_NAMES } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPwModalOpen, setIsPwModalOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const me = await api("/me");
        setData(me);
      } catch (err) {
        toast(err.message, false);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [toast]);

  if (loading) {
    return (
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <span className="dot"></span> HOSSAM MATH
          </div>
          <div className="sidebar-name">{user?.name || "Student"}</div>
        </aside>
        <main className="main">
          <div className="empty-state">Loading your dashboard…</div>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <span className="dot"></span> HOSSAM MATH
          </div>
          <div className="sidebar-name">{user?.name || "Student"}</div>
          <div className="sidebar-footer">
            <button className="btn" style={{ width: "100%" }} onClick={logout}>
              Sign out
            </button>
          </div>
        </aside>
        <main className="main">
          <div className="empty-state">Could not load dashboard data.</div>
        </main>
      </div>
    );
  }

  const attendance = data.attendance || [];
  const exams = data.exams || [];
  const payments = data.payments || [];

  const presentCount = attendance.filter((a) => a.status === "present").length;
  const now = new Date();
  const thisMonthPay = payments.find(
    (p) => p.month === now.getMonth() + 1 && p.year === now.getFullYear()
  );
  const isPaidThisMonth = !!thisMonthPay?.paid;

  return (
    <div className="app-shell">
      <Sidebar
        title={data.name}
        navItems={[{ id: "dashboard", label: "My dashboard" }]}
        activeId="dashboard"
        onChangePassword={() => setIsPwModalOpen(true)}
        onLogout={logout}
      />

      <main className="main">
        <div className="page-header">
          <div>
            <h2>My dashboard</h2>
            <div className="sub" id="group-line">
              {data.group_name
                ? `Group: ${data.group_name}`
                : "Not assigned to a group yet"}
            </div>
          </div>
        </div>

        <div className="stat-grid">
          <StatCard
            label="Attendance rate"
            value={data.attendance_rate === null ? "—" : `${data.attendance_rate}%`}
          />
          <StatCard
            label="Sessions attended"
            value={`${presentCount} / ${attendance.length}`}
          />
          <StatCard
            label="This month"
            value={isPaidThisMonth ? "Paid" : "Unpaid"}
            coral={!isPaidThisMonth}
          />
        </div>

        <div className="panel card">
          <div className="card-header">
            <h3>My info</h3>
          </div>
          <table>
            <tbody>
              <tr>
                <td className="muted">Name</td>
                <td>{data.name}</td>
              </tr>
              <tr>
                <td className="muted">Group</td>
                <td>{data.group_name || "—"}</td>
              </tr>
              <tr>
                <td className="muted">Username</td>
                <td className="mono">{data.username}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="panel card">
          <div className="card-header">
            <h3>Exam grades</h3>
          </div>
          {exams.length === 0 ? (
            <div className="empty-state">No exams recorded yet.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Date</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((e) => (
                  <tr key={e.id || `${e.exam_name}-${e.date}`}>
                    <td>{e.exam_name}</td>
                    <td className="mono muted">{e.date}</td>
                    <td className="mono">
                      {e.degree} / {e.max_degree}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel card">
          <div className="card-header">
            <h3>Attendance history</h3>
          </div>
          {attendance.length === 0 ? (
            <div className="empty-state">No attendance recorded yet.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((a, idx) => (
                  <tr key={a.id || `${a.date}-${idx}`}>
                    <td className="mono muted">{a.date}</td>
                    <td>
                      <span className={`pill pill-${a.status}`}>{a.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel card">
          <div className="card-header">
            <h3>Payment history</h3>
          </div>
          {payments.length === 0 ? (
            <div className="empty-state">No payment records yet.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, idx) => (
                  <tr key={p.id || `${p.month}-${p.year}-${idx}`}>
                    <td>
                      {MONTH_NAMES[p.month - 1]} {p.year}
                    </td>
                    <td className="mono">{p.amount}</td>
                    <td>
                      <span className={`pill pill-${p.paid ? "paid" : "unpaid"}`}>
                        {p.paid ? "paid" : "unpaid"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      <ChangePasswordModal
        isOpen={isPwModalOpen}
        onClose={() => setIsPwModalOpen(false)}
      />
    </div>
  );
}
