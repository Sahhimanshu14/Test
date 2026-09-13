import { apiClient } from './api-client';

export async function apiRequest<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  const method = options?.method?.toUpperCase() || 'GET';
  if (method === 'GET') {
    return apiClient.get<T>(endpoint, options);
  }
  if (method === 'POST') {
    const body = options?.body
      ? typeof options.body === 'string'
        ? JSON.parse(options.body)
        : options.body
      : undefined;
    return apiClient.post<T>(endpoint, body, options);
  }
  if (method === 'PATCH') {
    const body = options?.body
      ? typeof options.body === 'string'
        ? JSON.parse(options.body)
        : options.body
      : undefined;
    return apiClient.patch<T>(endpoint, body, options);
  }
  if (method === 'PUT') {
    const body = options?.body
      ? typeof options.body === 'string'
        ? JSON.parse(options.body)
        : options.body
      : undefined;
    return apiClient.put<T>(endpoint, body, options);
  }
  if (method === 'DELETE') {
    return apiClient.delete<T>(endpoint, options);
  }
  return apiClient.get<T>(endpoint, options);
}

export { apiClient, apiClient as api };

