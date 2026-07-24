import axios from "axios";
import { API_BASE_URL } from "../constants/api";

export const registerUser = async (userData) => {
  const response = await axios.post(
    `${API_BASE_URL}/auth/register`,
    userData
  );

  return response.data;
};

export const loginUser = async (userData) => {
  const response = await axios.post(
    `${API_BASE_URL}/auth/login`,
    userData
  );

  return response.data;
};