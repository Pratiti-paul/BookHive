import axios from "axios";
import { API_BASE_URL } from "../constants/api";

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Get logged-in student's wishlist
export async function getWishlist() {
  const response = await api.get("/wishlist");
  return response.data;
}

// Add a book to student's wishlist
export async function addToWishlist(bookId) {
  const response = await api.post(`/wishlist/${bookId}`);
  return response.data;
}

// Remove a book from student's wishlist
export async function removeFromWishlist(bookId) {
  const response = await api.delete(`/wishlist/${bookId}`);
  return response.data;
}

export default api;

