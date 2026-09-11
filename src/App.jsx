import React from "react";
import { useAuth } from "./context/AuthContext";
import ToastContainer from "./components/ToastContainer";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import StudentDashboard from "./pages/StudentDashboard";

export default function App() {
  const { isAuthenticated, user } = useAuth();

  let content;
  if (!isAuthenticated || !user) {
    content = <Login />;
  } else if (user.role === "admin") {
    content = <AdminDashboard />;
  } else if (user.role === "student") {
    content = <StudentDashboard />;
  } else {
    content = <Login />;
  }

  return (
    <>
      {content}
      <ToastContainer />
    </>
  );
}
