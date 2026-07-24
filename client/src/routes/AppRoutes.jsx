import { Routes, Route } from "react-router-dom";

import Home from "../pages/Home/Home.jsx";
import Login from "../pages/Login/Login.jsx";
import Register from "../pages/Register/Register.jsx";
import Unauthorized from "../pages/Unauthorized.jsx";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";
import StudentDashboard from "../pages/student/StudentDashboard.jsx";
import LibrarianDashboard from "../pages/librarian/LibrarianDashboard.jsx";
import AdminDashboard from "../pages/Admin/AdminDashboard.jsx";

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />

        <Route
      path="/student/dashboard"
      element={
        <RoleRoute allowedRoles={["student"]}>
          <StudentDashboard />
        </RoleRoute>
      }
    />

    <Route
      path="/librarian/dashboard"
      element={
        <RoleRoute allowedRoles={["librarian"]}>
          <LibrarianDashboard />
        </RoleRoute>
      }
    />

    <Route
      path="/admin/dashboard"
      element={
        <RoleRoute allowedRoles={["admin"]}>
          <AdminDashboard />
        </RoleRoute>
      }
    />

      <Route
        path="/unauthorized"
        element={<Unauthorized />}
      />
    </Routes>
  );
}

export default AppRoutes;