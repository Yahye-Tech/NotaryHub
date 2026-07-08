import { api, getAccessToken, ApiException } from "./client.js";

export interface FileUploadRecord {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  customer_id: string | null;
  document_id: string | null;
  uploaded_by: string;
  original_name: string;
  stored_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  category: string | null;
  file_hash: string | null;
  created_at: string;
  updated_at: string;
  uploader_name?: string | null;
}

export interface UiUploadedFile {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
  mimeType: string;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function toUiUploadedFile(u: FileUploadRecord): UiUploadedFile {
  return {
    id: u.id,
    name: u.original_name,
    type: u.category ?? "Supporting Documents",
    size: formatFileSize(u.size_bytes),
    uploadedAt: u.created_at.slice(0, 10),
    mimeType: u.mime_type,
  };
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

export function validateUploadFile(file: File): string | null {
  const lower = file.name.toLowerCase();
  const allowed = ALLOWED_EXTENSIONS.some(ext => lower.endsWith(ext));
  if (!allowed) {
    return "Only PDF, JPG, and PNG files are supported.";
  }
  if (file.size > 10 * 1024 * 1024) {
    return "File exceeds the 10 MB limit.";
  }
  return null;
}

export const uploadsApi = {
  list: (params?: { category?: string; limit?: number; offset?: number }) => {
    const qs = params
      ? "?" + Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join("&")
      : "";
    return api.get<{ uploads: FileUploadRecord[]; total: number }>(`/api/uploads${qs}`);
  },

  upload: async (file: File, category: string) => {
    const validationError = validateUploadFile(file);
    if (validationError) {
      throw new ApiException(422, "VALIDATION_ERROR", validationError);
    }
    const contentBase64 = await fileToBase64(file);
    return api.post<{ message: string; upload: FileUploadRecord }>("/api/uploads", {
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      contentBase64,
      category,
    });
  },

  delete: (id: string) =>
    api.delete<{ message: string }>(`/api/uploads/${id}`),

  download: async (id: string): Promise<Blob> => {
    const token = getAccessToken();
    const response = await fetch(`/api/uploads/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });
    if (!response.ok) {
      let errorBody: { error?: string; message?: string } = {};
      try {
        errorBody = await response.json();
      } catch {
        errorBody = { message: response.statusText };
      }
      throw new ApiException(
        response.status,
        errorBody.error ?? "DOWNLOAD_FAILED",
        errorBody.message ?? "Failed to download file"
      );
    }
    return response.blob();
  },
};
