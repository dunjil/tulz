import axios from "axios";
import Cookies from "js-cookie";
import { getShowUpgradeModal } from "@/components/shared/upgrade-modal";

// Helper to check if an error should show a toast (not a 402 usage limit error)
export function shouldShowErrorToast(error: any): boolean {
  // Don't show toast for 402 errors - the upgrade modal handles these
  if (error?.response?.status === 402) {
    return false;
  }
  // Don't show toast if explicitly marked as handled
  if (error?.handled) {
    return false;
  }
  return true;
}

// Use relative URL in production (requests go through same domain via nginx proxy)
// Only use absolute URL for local development
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// SECURITY: Helper to get secure cookie options
const getSecureCookieOptions = () => ({
  secure: typeof window !== "undefined" && window.location.protocol === "https:",
  sameSite: "lax" as const,
});

export const api = axios.create({
  baseURL: API_URL ? `${API_URL}/api/v1` : "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not a retry, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = Cookies.get("refresh_token");
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/api/v1/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token: newRefreshToken } =
            response.data;

          // SECURITY: Use secure cookie options
          const cookieOptions = getSecureCookieOptions();
          Cookies.set("access_token", access_token, { ...cookieOptions, expires: 1 / 48 });
          Cookies.set("refresh_token", newRefreshToken, { ...cookieOptions, expires: 7 });

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          Cookies.remove("access_token");
          Cookies.remove("refresh_token");
          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

// API helper functions
export const apiHelpers = {
  // Auth
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),

  register: (email: string, fullName: string, password: string) =>
    api.post("/auth/register", { email, full_name: fullName, password }),

  verifyEmail: (token: string) => api.post("/auth/verify-email", { token }),

  requestPasswordReset: (email: string) =>
    api.post("/auth/password-reset/request", { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post("/auth/password-reset/confirm", {
      token,
      new_password: newPassword,
    }),

  // User
  getCurrentUser: () => api.get("/users/me"),

  updateUser: (data: { full_name?: string; avatar_url?: string }) =>
    api.patch("/users/me", data),

  updateProfile: (data: { full_name?: string; avatar_url?: string }) =>
    api.patch("/users/me", data),

  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post("/auth/change-password", data),

  getRemainingUses: () => api.get("/users/me/remaining"),

  getUsageStats: () => api.get("/users/me/usage"),

  getUsageHistory: () => api.get("/users/me/history"),

  // Tools
  generateQRCode: (data: any) => api.post("/tools/qrcode/generate", data),

  calculate: (data: any) => api.post("/tools/calculator/calculate", data),

  getUnitCategories: () => api.get("/tools/calculator/units"),

  processImage: (formData: FormData) =>
    api.post("/tools/image/process", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  splitPdf: (formData: FormData) =>
    api.post("/tools/pdf/split", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  mergePdfs: (formData: FormData) =>
    api.post("/tools/pdf/merge", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  compressPdf: (formData: FormData) =>
    api.post("/tools/pdf/compress", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  pdfToWord: (formData: FormData) =>
    api.post("/tools/pdf/to-word", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  excelToCsv: (formData: FormData) =>
    api.post("/tools/excel/to-csv", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  getExcelInfo: (formData: FormData) =>
    api.post("/tools/excel/info", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),


  // JSON Formatter
  formatJson: (data: { content: string; indent?: number; sort_keys?: boolean }) =>
    api.post("/tools/json/format", data),

  minifyJson: (data: { content: string }) =>
    api.post("/tools/json/minify", data),

  validateJson: (data: { content: string }) =>
    api.post("/tools/json/validate", data),

  convertFormat: (data: { content: string; from_format: string; to_format: string; indent?: number }) =>
    api.post("/tools/json/convert", data),

  // Markdown to PDF
  markdownToPdf: (data: { content: string; theme?: string; title?: string }) =>
    api.post("/tools/markdown/convert", data),

  markdownPdfPreview: (data: { content: string; theme?: string; title?: string }) =>
    api.post("/tools/markdown/preview", data),

  getMarkdownThemes: () => api.get("/tools/markdown/themes"),

  // Text Diff
  compareTexts: (data: { text1: string; text2: string; context_lines?: number }) =>
    api.post("/tools/diff/compare", data),

  checkSimilarity: (data: { text1: string; text2: string }) =>
    api.post("/tools/diff/similarity", data),

  // Invoice Generator
  generateInvoice: (data: any) => api.post("/tools/invoice/generate", data),

  previewInvoice: (data: any) => api.post("/tools/invoice/preview", data),

  getInvoiceTemplates: () => api.get("/tools/invoice/templates"),

  // CV Generator
  generateCv: (data: { content: string; template?: string; title?: string }) =>
    api.post("/tools/cv/generate", data),

  cvPreview: (data: { content: string; template?: string; title?: string }) =>
    api.post("/tools/cv/preview", data),

  getCvTemplates: () => api.get("/tools/cv/templates"),

  getCvSamples: () => api.get("/tools/cv/samples"),

  getCvSampleContent: (sampleId: string) =>
    api.get(`/tools/cv/samples/${sampleId}`),

  // Feedback
  submitFeedback: (data: {
    type: string;
    subject: string;
    message: string;
    rating?: number;
    tool_name?: string;
    guest_email?: string;
    guest_name?: string;
  }) => api.post("/feedback/submit", data),

  getFeedbackTypes: () => api.get("/feedback/types"),

  getFeedbackTools: () => api.get("/feedback/tools"),

  getPublicFeedbackList: (params?: { page?: number; limit?: number }) =>
    api.get("/feedback/list", { params }),

  // Admin Feedback
  getAdminFeedbackList: (params?: {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) => api.get("/feedback/admin/list", { params }),

  getAdminFeedbackStats: () => api.get("/feedback/admin/stats"),

  getAdminFeedbackDetail: (feedbackId: string) =>
    api.get(`/feedback/admin/${feedbackId}`),

  updateAdminFeedback: (feedbackId: string, data: {
    status?: string;
    admin_notes?: string;
  }) => api.patch(`/feedback/admin/${feedbackId}`, data),

  deleteAdminFeedback: (feedbackId: string) =>
    api.delete(`/feedback/admin/${feedbackId}`),
};
