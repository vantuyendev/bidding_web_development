/**
 * Resolves local API paths to absolute URLs in production if VITE_API_URL is configured,
 * or keeps them relative to use the local Vite proxy in development.
 */
export const getApiUrl = (path) => {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  if (baseUrl) {
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const hasApiInBase = cleanBaseUrl.endsWith('/api');
    
    // Only strip '/api' if base URL already ends with '/api'
    const cleanPath = (hasApiInBase && path.startsWith('/api')) ? path.substring(4) : path;
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
    const hasApiInBase = cleanBaseUrl.endsWith('/api');
    
    // Only add '/api' prefix if the base URL does not already include it
    const pathPrefix = hasApiInBase ? '' : '/api';
    return `${cleanBaseUrl}${pathPrefix}/products/${productId}/live`;
  }
  return `/api/products/${productId}/live`;
};
