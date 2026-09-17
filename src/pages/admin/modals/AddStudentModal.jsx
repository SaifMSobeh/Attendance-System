import React, { useState } from "react";
import Modal from "../../../components/Modal";
import { api } from "../../../api";
import { useToast } from "../../../context/ToastContext";

export default function AddStudentModal({
  isOpen,
  onClose,
  groups = [],
  onStudentAdded,
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [groupId, setGroupId] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await api("/students", {
        method: "POST",
        body: {
          name,
          phone: phone || null,
          parent_phone: parentPhone,
          group_id: groupId ? Number(groupId) : null,
          monthly_fee: monthlyFee ? Number(monthlyFee) : undefined,
        },
      });
      setName("");
      setPhone("");
      setParentPhone("");
      setGroupId("");
      setMonthlyFee("");
      onClose();
      onStudentAdded(result);
    } catch (err) {
      toast(err.message, false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add student">
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
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Parent WhatsApp number (with country code, e.g. 201234567890)</label>
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
          <button type="button" className="btn" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Adding…" : "Add student"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
