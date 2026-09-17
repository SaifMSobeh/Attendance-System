import React, { useState, useEffect, useCallback } from "react";
import GroupModal from "./modals/GroupModal";
import { api } from "../../api";
import { useToast } from "../../context/ToastContext";

export default function GroupsView({ onSelectStudent }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupStudents, setGroupStudents] = useState([]);
  const [paymentAmounts, setPaymentAmounts] = useState({});
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
      const data = await api(`/groups/${group.id}/students`);
      setGroupStudents(data.students || []);
      const initialAmounts = {};
      (data.students || []).forEach((student) => {
        initialAmounts[student.id] = student.monthly_fee || 0;
      });
      setPaymentAmounts(initialAmounts);
    } catch (err) {
      toast(err.message, false);
      setSelectedGroup(null);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handlePaymentAmountChange = (studentId, value) => {
    setPaymentAmounts((current) => ({ ...current, [studentId]: value }));
  };

  const handleTogglePayment = async (student) => {
    const now = new Date();
    const amount = Number(paymentAmounts[student.id] ?? student.monthly_fee ?? 0);
    const paid = !student.paid_this_month;
    setProcessingPaymentId(student.id);
    try {
      const result = await api("/payments", {
        method: "POST",
        body: {
          student_id: student.id,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          amount,
          paid,
        },
      });
      setGroupStudents((current) =>
        current.map((item) =>
          item.id === student.id ? { ...item, paid_this_month: paid } : item
        )
      );
      if (paid && result.whatsapp && !result.whatsapp.ok) {
        toast(`Payment saved, but WhatsApp failed: ${result.whatsapp.reason}`, false);
      } else {
        toast(paid ? "Payment applied and parent notified." : "Payment marked unpaid.");
      }
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
                  <th>Amount</th>
                  <th>This month</th>
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
                    <td onClick={(event) => event.stopPropagation()}>
                      <input
                        type="number"
                        min="0"
                        value={paymentAmounts[student.id] ?? student.monthly_fee ?? 0}
                        onChange={(event) => handlePaymentAmountChange(student.id, event.target.value)}
                        style={{ width: "90px", padding: "6px 8px" }}
                      />
                    </td>
                    <td>
                      <span className={`pill pill-${student.paid_this_month ? "paid" : "unpaid"}`}>
                        {student.paid_this_month ? "paid" : "unpaid"}
                      </span>
                    </td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        className={`btn ${student.paid_this_month ? "btn-danger" : "btn-primary"}`}
                        onClick={() => handleTogglePayment(student)}
                        disabled={processingPaymentId === student.id}
                      >
                        {processingPaymentId === student.id
                          ? "Saving…"
                          : student.paid_this_month
                            ? "Mark unpaid"
                            : "Mark paid"}
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
