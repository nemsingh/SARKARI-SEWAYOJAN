const CACHE_PREFIX = 'ss_cache_';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes - reduces Firebase reads significantly

export const getCache = <T>(key: string): T | null => {
  if (typeof window !== 'undefined' && (window as any).__INITIAL_DATA__ && (window as any).__INITIAL_DATA__[key]) {
    return (window as any).__INITIAL_DATA__[key] as T;
  }
  if (typeof global !== 'undefined' && (global as any).__INITIAL_DATA__ && (global as any).__INITIAL_DATA__[key]) {
    return (global as any).__INITIAL_DATA__[key] as T;
  }
  try {
    const item = localStorage.getItem(CACHE_PREFIX + key);
    if (!item) return null;
    const { data, timestamp } = JSON.parse(item);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return data as T;
  } catch {
    return null;
  }
};

export const setCache = (key: string, data: any) => {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // Ignore localStorage errors
  }
};

export const clearCache = (key?: string) => {
  try {
    if (key) {
      localStorage.removeItem(CACHE_PREFIX + key);
    } else {
      Object.keys(localStorage)
        .filter(k => k.startsWith(CACHE_PREFIX))
        .forEach(k => localStorage.removeItem(k));
    }
  } catch {
    // Ignore localStorage errors
  }
};
