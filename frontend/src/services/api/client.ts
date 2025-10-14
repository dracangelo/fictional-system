import axios from 'axios';

interface ApiError {
  message: string;
  code: string;
  details?: Record<string, any>;
  timestamp: string;
}

interface ApiErrorResponse {
  error: ApiError;
  validationErrors?: Array<{
    field: string;
    message: string;
  }>;
}

class ApiClient {
  private client: any;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor for authentication
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.handleTokenRefresh();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            this.handleAuthError();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(this.formatError(error));
      }
    );
  }

  private async handleTokenRefresh(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const newToken = await this.refreshPromise;
      this.refreshPromise = null;
      return newToken;
    } catch (error) {
      this.refreshPromise = null;
      throw error;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(`${this.client.defaults.baseURL}/auth/refresh/`, {
      refresh: refreshToken,
    });

    const { access, refresh } = response.data;
    
    localStorage.setItem('token', access);
    localStorage.setItem('refreshToken', refresh);
    
    return access;
  }

  private handleAuthError() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Redirect to login page
    window.location.href = '/login';
  }

  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private formatError(error: any): ApiError {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }

    return {
      message: error.message || 'An unexpected error occurred',
      code: error.response?.status?.toString() || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString(),
    };
  }

  // HTTP methods
  async get<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();