// @ts-ignore
const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
export const API_BASE_URL = isNative ? 'https://finane.onrender.com' : window.location.origin;

export const getApiUrl = (path: string) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};
