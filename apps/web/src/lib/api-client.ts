function resolveApiBaseUrl(): string {
  let base = process.env.NEXT_PUBLIC_API_URL;
  if (!base || base === '/' || base === '""') {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/v1`;
    }
    return 'http://localhost:4000/api/v1';
  }

  if (base.startsWith('/')) {
    if (typeof window !== 'undefined') {
      base = `${window.location.origin}${base}`;
    } else {
      base = `http://localhost:4000${base}`;
    }
  }

  base = base.replace(/\/+$/, '');
  if (!base.endsWith('/api/v1')) {
    base = `${base}/api/v1`;
  }
  return base;
}

export const API_URL = resolveApiBaseUrl();

export function buildApiUrl(endpoint: string): string {
  let cleanEndpoint = endpoint.trim();
  if (cleanEndpoint.startsWith('/api/v1/')) {
    cleanEndpoint = cleanEndpoint.slice(7);
  } else if (cleanEndpoint.startsWith('api/v1/')) {
    cleanEndpoint = cleanEndpoint.slice(6);
  }

  cleanEndpoint = '/' + cleanEndpoint.replace(/^\/+/, '');
  return `${API_URL}${cleanEndpoint}`;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: any;
}

class ApiClient {
  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('cdsprep_access_token');
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('cdsprep_refresh_token');
  }

  public setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('cdsprep_access_token', accessToken);
    localStorage.setItem('cdsprep_refresh_token', refreshToken);
  }

  public clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('cdsprep_access_token');
    localStorage.removeItem('cdsprep_refresh_token');
    localStorage.removeItem('cdsprep_user');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false,
  ): Promise<T> {
    const url = buildApiUrl(endpoint);
    const token = this.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401 && !isRetry && this.getRefreshToken()) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          return this.request<T>(endpoint, options, true);
        }
      }

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        const error: ApiError = {
          statusCode: response.status,
          message: body?.message || 'An unexpected request error occurred',
          errors: body?.errors,
        };
        throw error;
      }

      return body?.data ?? body;
    } catch (err: any) {
      if (err.statusCode) {
        throw err;
      }
      throw {
        statusCode: 500,
        message: err.message || 'Network connection failed. Is the API running?',
      };
    }
  }

  private async tryRefreshToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(buildApiUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const body = await response.json();
      const tokens = body?.data || body;
      if (tokens?.accessToken && tokens?.refreshToken) {
        this.setTokens(tokens.accessToken, tokens.refreshToken);
        return true;
      }
      return false;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  public get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public put<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
