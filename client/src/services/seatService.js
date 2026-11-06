import axios from "axios";
import { API_BASE_URL } from "../constants/api";

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Retrieve seating arrangement for a specific library.
 * GET /api/seats/library/:libraryId
 *
 * @param {string} libraryId
 * @param {Object} [params] - Optional filters { isActive, type }
 */
export async function getLibrarySeats(libraryId, params = {}) {
  const response = await api.get(`/seats/library/${libraryId}`, { params });
  return response.data;
}

/**
 * Create a single seat or batch of seats.
 * POST /api/seats
 *
 * @param {Object} seatData - { libraryId, seatNumber, row, column, type, isActive } or { libraryId, seats: [...] }
 */
export async function createSeat(seatData) {
  const response = await api.post("/seats", seatData);
  return response.data;
}

/**
 * Update an existing seat.
 * PUT /api/seats/:id
 *
 * @param {string} seatId
 * @param {Object} updateData - { seatNumber, row, column, type, isActive }
 */
export async function updateSeat(seatId, updateData) {
  const response = await api.put(`/seats/${seatId}`, updateData);
  return response.data;
}

/**
 * Delete a seat.
 * If the seat has historical bookings, the backend will safely deactivate it instead of deleting.
 * DELETE /api/seats/:id
 *
 * @param {string} seatId
 */
export async function deleteSeat(seatId) {
  const response = await api.delete(`/seats/${seatId}`);
  return response.data;
}

/**
 * Configure a bulk seating grid layout for a library.
 * POST /api/seats/layout
 *
 * @param {Object} layoutData - { libraryId, rows, columns, prefix, type, replaceExisting }
 */
export async function configureBulkLayout(layoutData) {
  const response = await api.post("/seats/layout", layoutData);
  return response.data;
}

export default {
  getLibrarySeats,
  createSeat,
  updateSeat,
  deleteSeat,
  configureBulkLayout,
};

