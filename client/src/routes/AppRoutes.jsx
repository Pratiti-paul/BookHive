import { Routes, Route } from "react-router-dom";

import Home from "../pages/Home/Home.jsx";
import Login from "../pages/Login/Login.jsx";
import Register from "../pages/Register/Register.jsx";
import Unauthorized from "../pages/Unauthorized.jsx";
import RoleRoute from "./RoleRoute";
import StudentDashboard from "../pages/student/StudentDashboard.jsx";
import Books from "../pages/Books/Books.jsx";
import BookDetails from "../pages/BookDetails/BookDetails.jsx";
import MyBorrowedBooks from "../pages/BorrowedBooks/MyBorrowedBooks.jsx";
import Wishlist from "../pages/Wishlist/Wishlist.jsx";
import LibrarianDashboard from "../pages/librarian/LibrarianDashboard.jsx";
import LibrarianSeatingLayout from "../pages/librarian/LibrarianSeatingLayout.jsx";
import AdminDashboard from "../pages/Admin/AdminDashboard.jsx";
import Profile from "../pages/Profile/Profile.jsx";

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/" element={<Home />} />

      {/* Protected */}

      <Route
        path="/books"
        element={
          <RoleRoute allowedRoles={["student", "librarian", "admin"]}>
            <Books />
          </RoleRoute>
        }
      />

      <Route
        path="/books/:id"
        element={
          <RoleRoute allowedRoles={["student", "librarian", "admin"]}>
            <BookDetails />
          </RoleRoute>
        }
      />

      <Route
        path="/my-books"
        element={
          <RoleRoute allowedRoles={["student"]}>
            <MyBorrowedBooks />
          </RoleRoute>
        }
      />

      <Route
        path="/wishlist"
        element={
          <RoleRoute allowedRoles={["student"]}>
            <Wishlist />
          </RoleRoute>
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
      path="/librarian/seating"
      element={
        <RoleRoute allowedRoles={["librarian", "admin"]}>
          <LibrarianSeatingLayout />
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
      path="/profile"
      element={
        <RoleRoute allowedRoles={["student", "librarian", "admin"]}>
          <Profile />
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
