import React, { useState, useEffect, useCallback } from "react";
import Modal from "../../components/Modal";
import StatCard from "../../components/StatCard";
import { api, MONTH_NAMES } from "../../api";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";

export default function PaymentsView({ onSelectStudent }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState([]);
  const [paymentStudent, setPaymentStudent] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [totals, setTotals] = useState(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadPayments = useCallback(
    async (m, y, query = "") => {
      setLoading(true);
      try {
        const data = await api(
          `/payments/overview?month=${m}&year=${y}&search=${encodeURIComponent(query)}`
        );
        const paymentRows = Array.isArray(data)
          ? data
          : Array.isArray(data?.rows)
            ? data.rows
            : [];
        setRows(paymentRows);
        setTotals(!Array.isArray(data) && data?.totals ? data.totals : null);
      } catch (err) {
        toast(err.message, false);
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    loadPayments(month, year, search);
  }, [month, year, search, loadPayments]);

  const openPayment = (row) => {
    setPaymentStudent(row);
    setPaymentAmount(String(row.remaining > 0 ? row.remaining : row.monthly_fee || ""));
    setPaymentNote("");
  };

  const handlePayment = async (event) => {
    event.preventDefault();
    if (!paymentStudent) return;
    const studentId = paymentStudent.student_id;
    const amountVal = Number(paymentAmount);

    setProcessingPayment(true);
    try {
      const result = await api("/payments", {
        method: "POST",
        body: {
          student_id: studentId,
          month: Number(month),
          year: Number(year),
          amount: amountVal,
          note: paymentNote,
        },
      });
      if (result.whatsapp && !result.whatsapp.ok) {
        toast(`Payment saved, but WhatsApp failed: ${result.whatsapp.reason}`, false);
      } else {
        toast("Payment saved and parent notified.");
      }
      setPaymentStudent(null);
      setPaymentNote("");
      loadPayments(month, year, search);
    } catch (err) {
      toast(err.message, false);
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <section className="view">
      <div className="page-header">
        <div>
          <h2>Payments</h2>
          <div className="sub">Monthly tuition status for every student.</div>
        </div>
      </div>

      <div className="panel card">
        <div className="toolbar" style={{ marginBottom: "18px" }}>
          <div>
            <label>Month</label>
            <select
              id="pay-month"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i + 1} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Year</label>
            <input
              type="number"
              id="pay-year"
              style={{ width: "100px" }}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search payments"
              style={{ width: "100%", maxWidth: "280px" }}
            />
          </div>
        </div>

        {user && !user.is_co_admin && totals && (
          <div className="stat-grid" style={{ marginBottom: "18px" }}>
            <StatCard label="Expected this month" value={totals.expected.toLocaleString()} />
            <StatCard label="Received this month" value={totals.received.toLocaleString()} />
            <StatCard label="Remaining this month" value={totals.remaining.toLocaleString()} coral={totals.remaining > 0} />
            {totals.over_expected > 0 && (
              <StatCard label="Recorded above expected" value={totals.over_expected.toLocaleString()} coral />
            )}
          </div>
        )}

        {loading ? (
          <div className="empty-state">Loading payments…</div>
        ) : rows.length === 0 ? (
          <div className="empty-state">No students yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Monthly fee</th>
                <th>Received</th>
                <th>Remaining</th>
                <th>Above fee</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.student_id}>
                  <td>
                    <button
                      type="button"
                      className="btn"
                      style={{ padding: 0, border: 0, color: "var(--cyan)" }}
                      onClick={() => onSelectStudent(r.student_id)}
                    >
                      {r.name}
                    </button>
                  </td>
                  <td className="mono">
                    {Number(r.monthly_fee || 0) > 0 ? Number(r.monthly_fee).toLocaleString() : "Not set"}
                  </td>
                  <td className="mono">{Number(r.total_paid || 0).toLocaleString()}</td>
                  <td className="mono">{Number(r.monthly_fee || 0) > 0 ? Number(r.remaining || 0).toLocaleString() : "—"}</td>
                  <td className="mono">{Number(r.monthly_fee || 0) > 0 ? Math.max(Number(r.total_paid || 0) - Number(r.monthly_fee || 0), 0).toLocaleString() : "—"}</td>
                  <td>
                    <span
                      className={`pill pill-${r.paid ? "paid" : r.total_paid > 0 ? "neutral" : "unpaid"}`}
                      id={`pay-pill-${r.student_id}`}
                    >
                      {r.paid ? "paid" : r.total_paid > 0 ? "partial" : "unpaid"}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => openPayment(r)}
                      disabled={Number(r.monthly_fee || 0) > 0 && r.remaining <= 0}
                    >
                      {Number(r.monthly_fee || 0) > 0 && r.remaining <= 0 ? "Paid" : "Record payment"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal
        isOpen={!!paymentStudent}
        onClose={() => setPaymentStudent(null)}
        title={paymentStudent ? `Payment for ${paymentStudent.name}` : "Record payment"}
        maxWidth={440}
      >
        {paymentStudent && (
          <form onSubmit={handlePayment}>
            <p className="muted" style={{ marginTop: 0 }}>
              {Number(paymentStudent.monthly_fee || 0) > 0
                ? `Received ${paymentStudent.total_paid}; remaining ${paymentStudent.remaining}.`
                : `No monthly fee is set. Enter the amount received.`}
            </p>
            <div className="field">
              <label htmlFor="payment-amount">Amount received</label>
              <input
                id="payment-amount"
                type="number"
                min="0.01"
                max={Number(paymentStudent.monthly_fee || 0) > 0 ? paymentStudent.remaining : undefined}
                step="0.01"
                required
                autoFocus
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="payment-note">Note</label>
              <textarea
                id="payment-note"
                rows="3"
                value={paymentNote}
                onChange={(event) => setPaymentNote(event.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="toolbar" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="btn" onClick={() => setPaymentStudent(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={processingPayment}>
                {processingPayment ? "Saving…" : "Save payment"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </section>
  );
}
