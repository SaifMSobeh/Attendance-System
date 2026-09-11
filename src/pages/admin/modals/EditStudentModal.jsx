import React, { useState, useEffect } from "react";
import Modal from "../../../components/Modal";
import { api } from "../../../api";
import { useToast } from "../../../context/ToastContext";

export default function EditStudentModal({
  isOpen,
  onClose,
  student,
  groups = [],
  onStudentUpdated,
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [groupId, setGroupId] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (student) {
      setName(student.name || "");
      setPhone(student.phone || "");
      setParentPhone(student.parent_phone || "");
      setGroupId(student.group_id ? String(student.group_id) : "");
      setMonthlyFee(student.monthly_fee !== undefined && student.monthly_fee !== null ? String(student.monthly_fee) : "0");
    }
  }, [student]);

  if (!student) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api(`/students/${student.id}`, {
        method: "PUT",
        body: {
          name,
          phone: phone || null,
          parent_phone: parentPhone,
          group_id: groupId ? Number(groupId) : null,
          monthly_fee: monthlyFee ? Number(monthlyFee) : 0,
        },
      });
      toast("Student updated.");
      onClose();
      onStudentUpdated();
    } catch (err) {
      toast(err.message, false);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      const result = await api(`/students/${student.id}/reset-password`, {
        method: "POST",
      });
      toast(`New password: ${result.password}`);
    } catch (err) {
      toast(err.message, false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm(`Deactivate ${student.name}? Their login will stop working.`)) {
      return;
    }
    try {
      await api(`/students/${student.id}`, { method: "DELETE" });
      toast("Student deactivated.");
      onClose();
      onStudentUpdated();
    } catch (err) {
      toast(err.message, false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${student.name}`}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Full name</label>
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Student phone</label>
          <input
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Parent WhatsApp number</label>
          <input
            name="parent_phone"
            required
            value={parentPhone}
            onChange={(e) => setParentPhone(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Group</label>
          <select
            name="group_id"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            <option value="">— none —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Monthly fee</label>
          <input
            name="monthly_fee"
            type="number"
            value={monthlyFee}
            onChange={(e) => setMonthlyFee(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDeactivate}
            disabled={loading}
          >
            Deactivate
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleResetPassword}
            disabled={loading}
          >
            Reset password
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
