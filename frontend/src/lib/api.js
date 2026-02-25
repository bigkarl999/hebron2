import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_URL = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("adminToken");
      if (window.location.pathname.startsWith("/admin") && 
          window.location.pathname !== "/admin/login") {
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(error);
  }
);

// Public endpoints
export const createBooking = (data) => api.post("/bookings", data);
export const getAvailability = (startDate, endDate) =>
  api.get(`/bookings/availability?start_date=${startDate}&end_date=${endDate}`);
export const getPublicBookings = () => api.get("/bookings/public");

// Admin auth
export const adminLogin = (username, password) =>
  api.post("/admin/login", { username, password });

// Admin endpoints
export const getAdminBookings = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.date) params.append("date_filter", filters.date);
  if (filters.role) params.append("role_filter", filters.role);
  if (filters.name) params.append("name_filter", filters.name);
  if (filters.status) params.append("status_filter", filters.status);
  return api.get(`/admin/bookings?${params.toString()}`);
};

export const updateBooking = (id, data) => api.put(`/admin/bookings/${id}`, data);
export const deleteBooking = (id) => api.delete(`/admin/bookings/${id}`);
export const unlockSlot = (id) => api.post(`/admin/bookings/${id}/unlock`);

// Analytics
export const getAnalytics = (month, year) =>
  api.get(`/admin/analytics?month=${month}&year=${year}`);
export const getParticipantHistory = (name) =>
  api.get(`/admin/participant-history?name=${encodeURIComponent(name)}`);

// Reports
export const getMonthlyReport = (month, year) =>
  api.get(`/admin/reports/monthly?month=${month}&year=${year}`);

// Export
export const exportCSV = (month, year) => {
  const params = month && year ? `?month=${month}&year=${year}` : "";
  return `${API_URL}/admin/export/csv${params}`;
};

export const exportExcel = (month, year) => {
  const params = month && year ? `?month=${month}&year=${year}` : "";
  return `${API_URL}/admin/export/excel${params}`;
};

export default api;
