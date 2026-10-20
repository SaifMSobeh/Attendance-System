import React, { useState, useEffect, useCallback } from "react";
import GroupModal from "./modals/GroupModal";
import Modal from "../../components/Modal";
import { api, MONTH_NAMES } from "../../api";
import { useToast } from "../../context/ToastContext";

export default function GroupsView({ onSelectStudent }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupStudents, setGroupStudents] = useState([]);
  const now = new Date();
  const [paymentMonth, setPaymentMonth] = useState(now.getMonth() + 1);
  const [paymentYear, setPaymentYear] = useState(now.getFullYear());
  const [paymentStudent, setPaymentStudent] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [processingPaymentId, setProcessingPaymentId] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalGroup, setModalGroup] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const loadGroups = useCallback(async () => {
    try {
      const data = await api("/groups");
      setGroups(data);
    } catch (err) {
      toast(err.message, false);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm("Delete this group? Students in it will become unassigned.")) {
      return;
    }
    try {
      await api(`/groups/${groupId}`, { method: "DELETE" });
      toast("Group deleted.");
      loadGroups();
    } catch (err) {
      toast(err.message, false);
    }
  };

  const handleOpenAdd = () => {
    setModalGroup(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (group) => {
    setModalGroup(group);
    setIsModalOpen(true);
  };

  const handleOpenGroup = async (group) => {
    setSelectedGroup(group);
    setLoadingStudents(true);
    try {
      const data = await api(`/groups/${group.id}/students?month=${paymentMonth}&year=${paymentYear}`);
      setGroupStudents(data.students || []);
    } catch (err) {
      toast(err.message, false);
      setSelectedGroup(null);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (selectedGroup) handleOpenGroup(selectedGroup);
  }, [paymentMonth, paymentYear]);

  const openPaymentForm = (student) => {
    setPaymentStudent(student);
    setPaymentAmount(String(student.remaining > 0 ? student.remaining : student.monthly_fee || ""));
    setPaymentNote("");
  };

  const handlePayment = async (event) => {
    event.preventDefault();
    if (!paymentStudent) return;
    const amount = Number(paymentAmount);
    setProcessingPaymentId(paymentStudent.id);
    try {
      const result = await api("/payments", {
        method: "POST",
        body: {
          student_id: paymentStudent.id,
          month: paymentMonth,
          year: paymentYear,
          amount,
          note: paymentNote,
        },
      });
      if (result.whatsapp && !result.whatsapp.ok) {
        toast(`Payment saved, but WhatsApp failed: ${result.whatsapp.reason}`, false);
      } else {
        toast("Payment saved and parent notified.");
      }
      setPaymentStudent(null);
      handleOpenGroup(selectedGroup);
    } catch (err) {
      toast(err.message, false);
    } finally {
      setProcessingPaymentId(null);
    }
  };

  if (selectedGroup) {
    return (
      <section className="view">
        <div className="page-header">
          <div>
            <h2>{selectedGroup.name}</h2>
            <div className="sub">Students in this group and their current payment status.</div>
          </div>
          <button className="btn" onClick={() => setSelectedGroup(null)}>
            Back to groups
          </button>
        </div>

        <div className="panel card">
          <div className="toolbar" style={{ marginBottom: "18px" }}>
            <div><label>Payment month</label><select value={paymentMonth} onChange={(e) => setPaymentMonth(Number(e.target.value))}>{MONTH_NAMES.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></div>
            <div><label>Year</label><input type="number" value={paymentYear} onChange={(e) => setPaymentYear(Number(e.target.value))} style={{ width: "100px" }} /></div>
          </div>
          {loadingStudents ? (
            <div className="empty-state">Loading students…</div>
          ) : groupStudents.length === 0 ? (
            <div className="empty-state">No students in this group yet.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Parent WhatsApp</th>
                  <th>Received</th>
                  <th>Remaining</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {groupStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="student-row"
                    style={{ cursor: "pointer" }}
                    onClick={() => onSelectStudent(student.id)}
                  >
                    <td>{student.name}</td>
                    <td className="muted mono">{student.parent_phone || "—"}</td>
                    <td className="mono">{student.total_paid}</td>
                    <td className="mono">{Number(student.monthly_fee || 0) > 0 ? student.remaining : "—"}</td>
                    <td>
                      <span className={`pill pill-${student.paid_this_month ? "paid" : student.total_paid > 0 ? "neutral" : "unpaid"}`}>
                        {student.paid_this_month ? "paid" : student.total_paid > 0 ? "partial" : "unpaid"}
                      </span>
                    </td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        className={`btn ${student.remaining > 0 ? "btn-primary" : ""}`}
                        onClick={() => openPaymentForm(student)}
                        disabled={processingPaymentId === student.id || (Number(student.monthly_fee || 0) > 0 && student.remaining <= 0)}
                      >
                        {Number(student.monthly_fee || 0) > 0 && student.remaining <= 0 ? "Paid" : "Record payment"}
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
                <label htmlFor="group-payment-amount">Amount received</label>
                <input
                  id="group-payment-amount"
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
                <label htmlFor="group-payment-note">Note</label>
                <textarea
                  id="group-payment-note"
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
                <button
                  className="btn btn-primary"
                  disabled={processingPaymentId === paymentStudent.id}
                >
                  {processingPaymentId === paymentStudent.id ? "Saving…" : "Save payment"}
                </button>
              </div>
            </form>
          )}
        </Modal>
      </section>
    );
  }

  if (loading) {
    return <div className="empty-state">Loading groups…</div>;
  }

  return (
    <section className="view">
      <div className="page-header">
        <div>
          <h2>Groups</h2>
          <div className="sub">Class sections and schedules.</div>
        </div>
        <button
          className="btn btn-primary"
          id="add-group-btn"
          onClick={handleOpenAdd}
        >
          Add group
        </button>
      </div>

      <div className="panel card">
        {groups.length === 0 ? (
          <div className="empty-state">
            No groups yet. Add one to start organizing students.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Schedule</th>
                <th>Students</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
                {groups.map((g) => (
                <tr
                  key={g.id}
                  className="student-row"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleOpenGroup(g)}
                >
                  <td>{g.name}</td>
                  <td className="muted">{g.schedule_info || "—"}</td>
                  <td className="mono">{g.student_count}</td>
                  <td>
                    <button
                      className="btn"
                      style={{ marginRight: 8 }}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenEdit(g);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteGroup(g.id);
                      }}
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

      <GroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        group={modalGroup}
        onGroupSaved={loadGroups}
      />
    </section>
  );
}
