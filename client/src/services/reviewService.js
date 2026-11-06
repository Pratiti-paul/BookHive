import axios from "axios";
import { API_BASE_URL } from "../constants/api";

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Get all reviews for a specific book
export async function getBookReviews(bookId) {
  const response = await api.get(`/reviews/book/${bookId}`);
  return response.data;
}

// Get logged-in student's own reviews
export async function getMyReviews() {
  const response = await api.get("/reviews/my-reviews");
  return response.data;
}

// Submit a review for a book
export async function createReview({ bookId, rating, comment }) {
  const response = await api.post("/reviews", { bookId, rating, comment });
  return response.data;
}

// Update an existing review
export async function updateReview(reviewId, { rating, comment }) {
  const response = await api.put(`/reviews/${reviewId}`, { rating, comment });
  return response.data;
}

// Delete an existing review
export async function deleteReview(reviewId) {
  const response = await api.delete(`/reviews/${reviewId}`);
  return response.data;
}

export default api;

