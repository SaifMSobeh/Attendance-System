import React, { useState, useEffect, useCallback } from "react";
import StatCard from "../../components/StatCard";
import AddExamModal from "./modals/AddExamModal";
import QrBadgeModal from "./modals/QrBadgeModal";
import { api, MONTH_NAMES } from "../../api";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";

export default function StudentDetailView({ studentId, onBack }) {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [qrBadgeData, setQrBadgeData] = useState(null);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadStudent = useCallback(async () => {
    try {
      const data = await api(`/students/${studentId}`);
      setStudent(data);
    } catch (err) {
      toast(err.message, false);
    } finally {
      setLoading(false);
    }
  }, [studentId, toast]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  const handleShowQr = async () => {
    try {
      const data = await api(`/students/${studentId}/qr`);
      setQrBadgeData(data);
      setIsQrOpen(true);
    } catch (err) {
      toast(err.message, false);
    }
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm("Delete this exam record?")) return;
    try {
      await api(`/exams/${examId}`, { method: "DELETE" });
      toast("Exam record deleted.");
      loadStudent();
    } catch (err) {
      toast(err.message, false);
    }
  };

  if (loading) {
    return <div className="empty-state">Loading student details…</div>;
  }

  if (!student) {
    return (
      <div className="empty-state">
        <p>Could not load student profile.</p>
        <button className="btn" onClick={onBack}>
          ← Back to students
        </button>
      </div>
    );
  }

  const attendance = student.attendance || [];
  const exams = student.exams || [];
  const payments = student.payments || [];

  const totalDays = attendance.length;
  const presentDays = attendance.filter((a) => a.status === "present").length;
  const rate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : null;
  const now = new Date();
  const thisMonthPay = payments.find(
    (p) => p.month === now.getMonth() + 1 && p.year === now.getFullYear()
  );
  const monthlyFee = Number(student.monthly_fee || 0);
  const isPaidThisMonth = monthlyFee > 0 && Number(thisMonthPay?.amount || 0) >= monthlyFee;

  const subLine = student.group_name
    ? `${student.group_name} · ${student.parent_phone}`
    : student.parent_phone || "—";

  return (
    <section className="view">
      <div className="page-header">
        <div>
          <h2>{student.name}</h2>
          <div className="sub">{subLine}</div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn" onClick={handleShowQr}>
            QR badge
          </button>
          <button className="btn" onClick={onBack}>
            ← Back to students
          </button>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard
          label="Attendance rate"
          value={rate === null ? "—" : `${rate}%`}
        />
        <StatCard
          label="Sessions attended"
          value={`${presentDays} / ${totalDays}`}
        />
        <StatCard
          label="This month"
          value={isPaidThisMonth ? "Paid" : "Unpaid"}
          coral={!isPaidThisMonth}
        />
      </div>

      <div className="panel card">
        <div className="card-header">
          <h3>Attendance</h3>
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
          <h3>Exams</h3>
          <button
            className="btn"
            onClick={() => setIsAddExamOpen(true)}
          >
            Add exam
          </button>
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {exams.map((e) => (
                <tr key={e.id}>
                  <td>{e.exam_name}</td>
                  <td className="mono muted">{e.date}</td>
                  <td className="mono">
                    {e.degree} / {e.max_degree}
                  </td>
                  <td>
                    <button
                      className="btn"
                      onClick={() => handleDeleteExam(e.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel card">
        <div className="card-header">
          <h3>Payments</h3>
        </div>
        {payments.length === 0 ? (
          <div className="empty-state">No payment records yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Amount</th>
                {!user?.is_co_admin && <th>Note</th>}
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
                  {!user?.is_co_admin && <td>{p.note || "—"}</td>}
                  <td>
                    <span className={`pill pill-${p.source === "transaction" ? "neutral" : p.paid ? "paid" : "unpaid"}`}>
                      {p.source === "transaction" ? "received" : p.paid ? "paid" : "unpaid"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AddExamModal
        isOpen={isAddExamOpen}
        onClose={() => setIsAddExamOpen(false)}
        studentId={studentId}
        onExamAdded={loadStudent}
      />

      <QrBadgeModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        qrData={qrBadgeData}
      />
    </section>
  );
}
