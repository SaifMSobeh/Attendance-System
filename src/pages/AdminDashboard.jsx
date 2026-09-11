import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import ChangePasswordModal from "../components/ChangePasswordModal";
import OverviewView from "./admin/OverviewView";
import StudentsView from "./admin/StudentsView";
import StudentDetailView from "./admin/StudentDetailView";
import GroupsView from "./admin/GroupsView";
import AttendanceView from "./admin/AttendanceView";
import ScanView from "./admin/ScanView";
import ExamsView from "./admin/ExamsView";
import PaymentsView from "./admin/PaymentsView";
import WhatsAppView from "./admin/WhatsAppView";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "students", label: "Students" },
  { id: "groups", label: "Groups" },
  { id: "attendance", label: "Take attendance" },
  { id: "scan", label: "Scan attendance" },
  { id: "exams", label: "Exams" },
  { id: "payments", label: "Payments" },
  { id: "whatsapp", label: "WhatsApp" },
];

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [currentView, setCurrentView] = useState("overview");
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [isPwModalOpen, setIsPwModalOpen] = useState(false);

  const handleSelectView = (viewId) => {
    setSelectedStudentId(null);
    setCurrentView(viewId);
  };

  const handleSelectStudent = (id) => {
    setSelectedStudentId(id);
    setCurrentView("student-detail");
  };

  const activeNavId =
    currentView === "student-detail" ? "students" : currentView;

  return (
    <div className="app-shell">
      <Sidebar
        title="Admin"
        navItems={NAV_ITEMS}
        activeId={activeNavId}
        onSelect={handleSelectView}
        onChangePassword={() => setIsPwModalOpen(true)}
        onLogout={logout}
      />

      <main className="main">
        {currentView === "overview" && (
          <OverviewView onSelectStudent={handleSelectStudent} />
        )}
        {currentView === "students" && (
          <StudentsView onSelectStudent={handleSelectStudent} />
        )}
        {currentView === "student-detail" && selectedStudentId && (
          <StudentDetailView
            studentId={selectedStudentId}
            onBack={() => setCurrentView("students")}
          />
        )}
        {currentView === "groups" && <GroupsView />}
        {currentView === "attendance" && <AttendanceView />}
        {currentView === "scan" && <ScanView />}
        {currentView === "exams" && (
          <ExamsView onGoToStudents={() => setCurrentView("students")} />
        )}
        {currentView === "payments" && <PaymentsView />}
        {currentView === "whatsapp" && <WhatsAppView />}
      </main>

      <ChangePasswordModal
        isOpen={isPwModalOpen}
        onClose={() => setIsPwModalOpen(false)}
      />
    </div>
  );
}
