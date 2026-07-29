import axios from "axios";
import { API_BASE_URL } from "../constants/api";

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function getBooks(params = {}) {
  const response = await api.get("/books", { params });
  return response.data;
}

export async function getLibraries() {
  const response = await api.get("/libraries");
  return response.data;
}

export async function getBookById(bookId) {
  const response = await api.get(`/books/${bookId}`);
  return response.data;
}

export async function getBookReviews(bookId) {
  const response = await api.get(`/reviews/book/${bookId}`);
  return response.data;
}

export async function getWishlist() {
  const response = await api.get("/wishlist");
  return response.data;
}

export async function addToWishlist(bookId) {
  const response = await api.post(`/wishlist/${bookId}`);
  return response.data;
}

export async function removeFromWishlist(bookId) {
  const response = await api.delete(`/wishlist/${bookId}`);
  return response.data;
}
