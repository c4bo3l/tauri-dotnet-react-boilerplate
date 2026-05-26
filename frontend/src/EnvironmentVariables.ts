const _env = import.meta.env as Record<string, string | undefined>;

export const API_BASE = _env.VITE_API_BASE ?? 'http://127.0.0.1:5199';
