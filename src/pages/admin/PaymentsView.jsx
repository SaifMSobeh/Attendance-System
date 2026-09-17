import React, { useState, useEffect, useCallback } from "react";
import StatCard from "../../components/StatCard";
import { api, MONTH_NAMES } from "../../api";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";

export default function PaymentsView() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState([]);
  const [amounts, setAmounts] = useState({});
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
        const initialAmounts = {};
        paymentRows.forEach((r) => {
          initialAmounts[r.student_id] = r.amount;
        });
        setAmounts(initialAmounts);
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

  const handleAmountChange = (studentId, val) => {
    setAmounts((prev) => ({ ...prev, [studentId]: val }));
  };

  const handleTogglePayment = async (row) => {
    const studentId = row.student_id;
    const currentPaid = !!row.paid;
    const newPaid = !currentPaid;
    const amountVal = Number(amounts[studentId] ?? row.amount);

    try {
      const result = await api("/payments", {
        method: "POST",
        body: {
          student_id: studentId,
          month: Number(month),
          year: Number(year),
          amount: amountVal,
          paid: newPaid,
        },
      });
      if (newPaid && result.whatsapp && !result.whatsapp.ok) {
        toast(`Payment saved, but WhatsApp failed: ${result.whatsapp.reason}`, false);
      } else {
        toast(newPaid ? "Marked as paid and parent notified." : "Marked as unpaid.");
      }
      loadPayments(month, year, search);
    } catch (err) {
      toast(err.message, false);
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
                <th>Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.student_id}>
                  <td>{r.name}</td>
                  <td className="mono">
                    <input
                      type="number"
                      value={amounts[r.student_id] ?? r.amount}
                      onChange={(e) =>
                        handleAmountChange(r.student_id, e.target.value)
                      }
                      style={{ width: "90px", padding: "6px 8px" }}
                    />
                  </td>
                  <td>
                    <span
                      className={`pill pill-${r.paid ? "paid" : "unpaid"}`}
                      id={`pay-pill-${r.student_id}`}
                    >
                      {r.paid ? "paid" : "unpaid"}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`btn ${r.paid ? "btn-danger" : "btn-primary"}`}
                      onClick={() => handleTogglePayment(r)}
                    >
                      {r.paid ? "Mark unpaid" : "Mark paid"}
                    </button>
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
