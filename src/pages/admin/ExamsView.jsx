import React from "react";

export default function ExamsView({ onGoToStudents }) {
  return (
    <section className="view">
      <div className="page-header">
        <div>
          <h2>Exams</h2>
          <div className="sub">
            Pick a student from the Students tab to add or edit exam grades.
          </div>
        </div>
      </div>
      <div className="panel card">
        <div className="empty-state">
          Open a student's profile (Students tab) to record exam grades.
          {onGoToStudents && (
            <div style={{ marginTop: 14 }}>
              <button className="btn btn-primary" onClick={onGoToStudents}>
                Go to Students tab
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
