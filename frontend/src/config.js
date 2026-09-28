// Central place for every backend URL the frontend talks to.
// Localhost fallbacks are used ONLY in `vite dev`; production builds fall back to the
// deployed Render backend and never to localhost.

const strip = (u) => (u || '').replace(/\/+$/, '');
const env = import.meta.env;
const isDev = env.DEV;

export const BACKEND_URL = strip(
  env.VITE_API_URL ||
    env.VITE_BACKEND_URL ||
    (isDev ? 'http://localhost:5000' : 'https://justicechain-wl80.onrender.com')
);

// Optional services: not deployed yet, so in production they are empty unless configured.
export const BLOCKCHAIN_URL = strip(env.VITE_BLOCKCHAIN_URL || (isDev ? 'http://localhost:3000' : ''));
export const AI_URL = strip(env.VITE_AI_URL || (isDev ? 'http://127.0.0.1:5050' : ''));

export const API_BASE_URL = `${BACKEND_URL}/api`;