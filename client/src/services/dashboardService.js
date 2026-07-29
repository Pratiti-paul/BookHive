import axios from "axios";
import { API_BASE_URL } from "../constants/api";

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) config.headers.Authorization = `Bearer ${token}`;

  return config;
});

const getResultData = (result, key) =>
  result.status === "fulfilled" ? result.value.data[key] : [];

const getError = (result) =>
  result.status === "rejected"
    ? result.reason.response?.data?.message || "Unable to load this section."
    : null;

export async function getStudentDashboardData() {
  const results = await Promise.allSettled([
    api.get("/borrow/my-books"),
    api.get("/wishlist"),
    api.get("/notifications"),
    api.get("/seat-bookings/my-bookings"),
    api.get("/books", { params: { limit: 8, sort: "-createdAt", status: "available" } }),
  ]);

  const [borrowed, wishlist, notifications, bookings, books] = results;

  return {
    borrows: getResultData(borrowed, "borrows"),
    wishlist: getResultData(wishlist, "wishlist"),
    notifications: getResultData(notifications, "notifications"),
    unreadCount: notifications.status === "fulfilled" ? notifications.value.data.unreadCount || 0 : 0,
    bookings: getResultData(bookings, "bookings"),
    books: getResultData(books, "books"),
    errors: {
      borrowed: getError(borrowed),
      wishlist: getError(wishlist),
      notifications: getError(notifications),
      bookings: getError(bookings),
      books: getError(books),
    },
  };
}
