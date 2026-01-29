const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://local.genfeed.ai:3001/api';

interface FetchOptions extends RequestInit {
  signal?: AbortSignal;
}

class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      errorData.message || `HTTP error ${response.status}`,
      errorData
    );
  }

  return response.json();
}

/**
 * Upload a file using FormData
 */
async function uploadFile<T>(endpoint: string, file: File, options: FetchOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const formData = new FormData();
  formData.append('file', file);

  const config: RequestInit = {
    method: 'POST',
    body: formData,
    // Don't set Content-Type - browser will set it with boundary for multipart/form-data
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      errorData.message || `HTTP error ${response.status}`,
      errorData
    );
  }

  return response.json();
}

export const apiClient = {
  get: <T>(endpoint: string, options?: FetchOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown, options?: FetchOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown, options?: FetchOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown, options?: FetchOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, options?: FetchOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),

  /**
   * Upload a file to the server
   * @param endpoint - API endpoint (e.g., '/files/workflows/{workflowId}/input/image')
   * @param file - File to upload
   * @param options - Additional fetch options
   */
  uploadFile: <T>(endpoint: string, file: File, options?: FetchOptions) =>
    uploadFile<T>(endpoint, file, options),
};

export { ApiError };
