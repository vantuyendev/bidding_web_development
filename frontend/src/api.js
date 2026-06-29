/**
 * Resolves local API paths to absolute URLs in production if VITE_API_URL is configured,
 * or keeps them relative to use the local Vite proxy in development.
 */
export const getApiUrl = (path) => {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  if (baseUrl) {
    // If the path starts with '/api', we strip it since VITE_API_URL usually includes '/api'
    const cleanPath = path.startsWith('/api') ? path.substring(4) : path;
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanPathWithSlash = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    return `${cleanBaseUrl}${cleanPathWithSlash}`;
  }
  return path;
};

/**
 * Resolves the EventSource (SSE) endpoint dynamically.
 */
export const getSseUrl = (productId) => {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  if (baseUrl) {
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBaseUrl}/products/${productId}/live`;
  }
  return `http://localhost:5000/api/products/${productId}/live`;
};
