/**
 * REST API client with JWT authentication and error wrapping
 */

const getAuthToken = () => localStorage.getItem('aharlocal_token');

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function buildUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  if (!API_BASE_URL) {
    return endpoint;
  }
  if (API_BASE_URL.endsWith('/api') && endpoint.startsWith('/api/')) {
    return `${API_BASE_URL}${endpoint.substring(4)}`;
  }
  return `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
}

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = buildUrl(endpoint);

  try {
    const res = await fetch(url, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => ({
      success: false,
      message: 'Network error or invalid server response'
    }));

    if (!res.ok || data.success === false) {
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }

    return data.data;
  } catch (err: any) {
    console.error(`API Error on ${endpoint}:`, err.message);
    throw err;
  }
}
