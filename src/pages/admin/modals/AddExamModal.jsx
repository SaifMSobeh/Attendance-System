import React, { useState } from "react";
import Modal from "../../../components/Modal";
import { api, todayStr } from "../../../api";
import { useToast } from "../../../context/ToastContext";

export default function AddExamModal({
  isOpen,
  onClose,
  studentId,
  onExamAdded,
}) {
  const { toast } = useToast();
  const [examName, setExamName] = useState("");
  const [date, setDate] = useState(todayStr());
  const [degree, setDegree] = useState("");
  const [maxDegree, setMaxDegree] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api("/exams", {
        method: "POST",
        body: {
          student_id: studentId,
          exam_name: examName,
          degree: Number(degree),
          max_degree: Number(maxDegree),
          date,
          notes: notes || null,
        },
      });
      toast("Exam grade added.");
      setExamName("");
      setDate(todayStr());
      setDegree("");
      setMaxDegree("");
      setNotes("");
      onClose();
      onExamAdded();
    } catch (err) {
      toast(err.message, false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add exam grade">
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Exam name</label>
          <input
            name="exam_name"
            required
            placeholder="e.g. Chapter 4 Test"
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Date</label>
          <input
            name="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="field" style={{ display: "flex", gap: "10px" }}>
          <div style={{ flex: 1 }}>
            <label>Score</label>
            <input
              name="degree"
              type="number"
              step="0.5"
              required
              value={degree}
              onChange={(e) => setDegree(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>Out of</label>
            <input
              name="max_degree"
              type="number"
              step="0.5"
              required
              value={maxDegree}
              onChange={(e) => setMaxDegree(e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label>Notes (optional)</label>
          <input
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
