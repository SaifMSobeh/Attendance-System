import React, { useState, useEffect, useCallback } from "react";
import { api, MONTH_NAMES } from "../../api";
import { useToast } from "../../context/ToastContext";

export default function PaymentsView() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState([]);
  const [amounts, setAmounts] = useState({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadPayments = useCallback(
    async (m, y) => {
      setLoading(true);
      try {
        const data = await api(`/payments/overview?month=${m}&year=${y}`);
        setRows(data);
        const initialAmounts = {};
        data.forEach((r) => {
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
    loadPayments(month, year);
  }, [month, year, loadPayments]);

  const handleAmountChange = (studentId, val) => {
    setAmounts((prev) => ({ ...prev, [studentId]: val }));
  };

  const handleTogglePayment = async (row) => {
    const studentId = row.student_id;
    const currentPaid = !!row.paid;
    const newPaid = !currentPaid;
    const amountVal = Number(amounts[studentId] ?? row.amount);

    try {
      await api("/payments", {
        method: "POST",
        body: {
          student_id: studentId,
          month: Number(month),
          year: Number(year),
          amount: amountVal,
          paid: newPaid,
        },
      });
      toast(newPaid ? "Marked as paid." : "Marked as unpaid.");
      loadPayments(month, year);
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
        </div>

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
