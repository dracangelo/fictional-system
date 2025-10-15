import axios, { AxiosError } from 'axios';
import { storeOfflineAction, isOffline } from '../../utils/serviceWorker';

interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition?: (error: AxiosError) => boolean;
}

// Type aliases for axios types to maintain compatibility
type AxiosResponse<T = any> = {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  config: any;
  request?: any;
};

type InternalAxiosRequestConfig = {
  url?: string;
  method?: string;
  baseURL?: string;
  headers?: any;
  params?: any;
  data?: any;
  timeout?: number;
  withCredentials?: boolean;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer' | 'document' | 'stream';
  maxRedirects?: number;
  validateStatus?: (status: number) => boolean;
  _retry?: boolean;
  _retryCount?: number;
  _retryConfig?: RetryConfig;
};

type RequestConfig = {
  url?: string;
  method?: string;
  baseURL?: string;
  headers?: any;
  params?: any;
  data?: any;
  timeout?: number;
  withCredentials?: boolean;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer' | 'document' | 'stream';
  maxRedirects?: number;
  validateStatus?: (status: number) => boolean;
};

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
  private defaultRetryConfig: RetryConfig = {
    retries: 3,
    retryDelay: 1000,
    retryCondition: (error: AxiosError) => {
      // Retry on network errors or 5xx server errors
      return !error.response || (error.response.status >= 500 && error.response.status < 600);
    },
  };

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
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { 
          _retry?: boolean; 
          _retryCount?: number;
          _retryConfig?: RetryConfig;
        };

        // Handle authentication errors
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.handleTokenRefresh();
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            this.handleAuthError();
            return Promise.reject(refreshError);
          }
        }

        // Handle offline scenarios
        if (!navigator.onLine || error.code === 'NETWORK_ERROR') {
          return this.handleOfflineRequest(originalRequest, error);
        }

        // Handle retry logic
        const retryConfig = originalRequest._retryConfig || this.defaultRetryConfig;
        const retryCount = originalRequest._retryCount || 0;

        if (retryCount < retryConfig.retries && retryConfig.retryCondition?.(error)) {
          originalRequest._retryCount = retryCount + 1;
          
          // Exponential backoff
          const delay = retryConfig.retryDelay * Math.pow(2, retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          return this.client(originalRequest);
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

  private async handleOfflineRequest(
    originalRequest: InternalAxiosRequestConfig,
    error: AxiosError
  ): Promise<never> {
    // Store the request for later processing when online
    if (originalRequest.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(originalRequest.method.toUpperCase())) {
      const actionId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      storeOfflineAction({
        id: actionId,
        url: originalRequest.url || '',
        options: {
          method: originalRequest.method,
          headers: originalRequest.headers as Record<string, string>,
          body: originalRequest.data ? JSON.stringify(originalRequest.data) : undefined,
        },
        timestamp: Date.now(),
      });
    }

    const offlineError: ApiError = {
      message: 'You are currently offline. Your action has been queued and will be processed when you reconnect.',
      code: 'OFFLINE_ERROR',
      timestamp: new Date().toISOString(),
      details: {
        queued: true,
        originalUrl: originalRequest.url,
        originalMethod: originalRequest.method,
      },
    };

    return Promise.reject(offlineError);
  }

  private formatError(error: AxiosError): ApiError {
    // Handle network errors
    if (!error.response) {
      return {
        message: 'Network error. Please check your internet connection.',
        code: 'NETWORK_ERROR',
        timestamp: new Date().toISOString(),
        details: {
          originalError: error.message,
        },
      };
    }

    // Handle API errors with structured response
    if (error.response.data && typeof error.response.data === 'object') {
      const data = error.response.data as any;
      
      if (data.error) {
        return data.error;
      }

      // Handle validation errors
      if (data.validationErrors || data.errors) {
        return {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
          details: {
            validationErrors: data.validationErrors || data.errors,
          },
        };
      }
    }

    // Handle HTTP status errors
    const statusMessages: Record<number, string> = {
      400: 'Bad request. Please check your input.',
      403: 'You do not have permission to perform this action.',
      404: 'The requested resource was not found.',
      409: 'Conflict. The resource already exists or is in use.',
      422: 'Invalid data provided.',
      429: 'Too many requests. Please try again later.',
      500: 'Internal server error. Please try again later.',
      502: 'Service temporarily unavailable.',
      503: 'Service temporarily unavailable.',
      504: 'Request timeout. Please try again.',
    };

    return {
      message: statusMessages[error.response.status] || 'An unexpected error occurred',
      code: `HTTP_${error.response.status}`,
      timestamp: new Date().toISOString(),
      details: {
        status: error.response.status,
        statusText: error.response.statusText,
      },
    };
  }

  // HTTP methods with enhanced error handling
  async get<T>(url: string, config?: RequestConfig & { retryConfig?: RetryConfig }): Promise<T> {
    const { retryConfig, ...axiosConfig } = config || {};
    const requestConfig = {
      ...axiosConfig,
      _retryConfig: retryConfig,
    };
    
    const response = await this.client.get(url, requestConfig);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: RequestConfig & { retryConfig?: RetryConfig }): Promise<T> {
    const { retryConfig, ...axiosConfig } = config || {};
    const requestConfig = {
      ...axiosConfig,
      _retryConfig: retryConfig,
    };
    
    const response = await this.client.post(url, data, requestConfig);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: RequestConfig & { retryConfig?: RetryConfig }): Promise<T> {
    const { retryConfig, ...axiosConfig } = config || {};
    const requestConfig = {
      ...axiosConfig,
      _retryConfig: retryConfig,
    };
    
    const response = await this.client.put(url, data, requestConfig);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: RequestConfig & { retryConfig?: RetryConfig }): Promise<T> {
    const { retryConfig, ...axiosConfig } = config || {};
    const requestConfig = {
      ...axiosConfig,
      _retryConfig: retryConfig,
    };
    
    const response = await this.client.patch(url, data, requestConfig);
    return response.data;
  }

  async delete<T>(url: string, config?: RequestConfig & { retryConfig?: RetryConfig }): Promise<T> {
    const { retryConfig, ...axiosConfig } = config || {};
    const requestConfig = {
      ...axiosConfig,
      _retryConfig: retryConfig,
    };
    
    const response = await this.client.delete(url, requestConfig);
    return response.data;
  }

  // Utility method to check if a request should be retried
  shouldRetry(error: AxiosError, retryCount: number, maxRetries: number): boolean {
    if (retryCount >= maxRetries) return false;
    
    // Don't retry client errors (4xx) except for specific cases
    if (error.response && error.response.status >= 400 && error.response.status < 500) {
      // Retry on rate limiting
      return error.response.status === 429;
    }
    
    // Retry on network errors or server errors (5xx)
    return !error.response || error.response.status >= 500;
  }

  // Method to manually retry a failed request
  async retryRequest<T>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    url: string,
    data?: any,
    config?: RequestConfig,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        switch (method) {
          case 'get':
            return await this.get<T>(url, config);
          case 'post':
            return await this.post<T>(url, data, config);
          case 'put':
            return await this.put<T>(url, data, config);
          case 'patch':
            return await this.patch<T>(url, data, config);
          case 'delete':
            return await this.delete<T>(url, config);
          default:
            throw new Error(`Unsupported method: ${method}`);
        }
      } catch (error) {
        lastError = error as Error;
        
        if (i < maxRetries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, i), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }
}

export const apiClient = new ApiClient();