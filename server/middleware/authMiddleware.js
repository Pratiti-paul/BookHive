import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Protect Routes
export const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

// Role Based Authorization
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to access this resource.",
      });
    }

    next();
  };
};

/**
 * Helper to verify whether a user is authorized for a specific library ID.
 * - Admins are authorized across all libraries.
 * - Librarians are authorized ONLY for their assigned library.
 * - Students or unassigned librarians return false.
 */
export const isAuthorizedForLibrary = (user, libraryId) => {
  if (!user || !libraryId) return false;
  if (user.role === "admin") return true;
  if (user.role === "librarian") {
    if (!user.library) return false;
    return user.library.toString() === libraryId.toString();
  }
  return false;
};

/**
 * Reusable Librarian Library Authorization Middleware.
 * - Ensures user is authenticated.
 * - Admins retain global access across all libraries.
 * - Librarians must have an assigned library.
 * - If resourceLibraryResolver is provided, resolves the target library and verifies match.
 */
export const checkLibrarianLibrary = (resourceLibraryResolver) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // Admins retain unrestricted platform-wide access
    if (req.user.role === "admin") {
      return next();
    }

    // Must be a librarian
    if (req.user.role !== "librarian") {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to access this resource.",
      });
    }

    // Verify librarian has an assigned library
    if (!req.user.library) {
      return res.status(403).json({
        success: false,
        message: "No library assigned to this librarian.",
      });
    }

    // If resolver is provided, verify resource library matches librarian's library
    if (resourceLibraryResolver) {
      try {
        const targetLibraryId = await resourceLibraryResolver(req);
        if (targetLibraryId) {
          if (targetLibraryId.toString() !== req.user.library.toString()) {
            return res.status(403).json({
              success: false,
              message:
                "You don't have permission to access or modify resources belonging to another library.",
            });
          }
        }
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "Server Error verifying library permissions.",
        });
      }
    }

    next();
  };
};