import axios from "axios";
import { API_BASE_URL } from "../constants/api";

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Student: Get my borrow records (includes active, pending requests, returned)
export async function getMyBorrowedBooks() {
  const response = await api.get("/borrow/my-books");
  return response.data;
}

// Student: Request to borrow a book
export async function requestBorrow(bookId) {
  const response = await api.post("/borrow/request", { bookId });
  return response.data;
}

// Student: Request renewal for an active loan
export async function requestRenewal(borrowId) {
  const response = await api.put(`/borrow/${borrowId}/request-renewal`);
  return response.data;
}

// Librarian / Admin: Get borrow requests
export async function getBorrowRequests(params = {}) {
  const response = await api.get("/borrow/requests", { params });
  return response.data;
}

// Librarian / Admin: Approve borrow request
export async function approveBorrowRequest(borrowId) {
  const response = await api.put(`/borrow/requests/${borrowId}/approve`);
  return response.data;
}

// Librarian / Admin: Reject borrow request
export async function rejectBorrowRequest(borrowId, reason) {
  const response = await api.put(`/borrow/requests/${borrowId}/reject`, { reason });
  return response.data;
}

// Librarian / Admin: Approve renewal request
export async function approveRenewalRequest(borrowId) {
  const response = await api.put(`/borrow/renewals/${borrowId}/approve`);
  return response.data;
}

// Librarian / Admin: Reject renewal request
export async function rejectRenewalRequest(borrowId, reason) {
  const response = await api.put(`/borrow/renewals/${borrowId}/reject`, { reason });
  return response.data;
}

export default api;
