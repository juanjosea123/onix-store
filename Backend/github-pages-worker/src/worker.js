const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 10;
const PBKDF2_ITERATIONS = 210_000;
const encoder = new TextEncoder();

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin || origin !== env.ALLOWED_ORIGIN) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(request, env, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      ...corsHeaders(request, env),
    },
  });
}

function isAllowedOrigin(request, env) {
  return request.headers.get('Origin') === env.ALLOWED_ORIGIN;
}

function cleanRequiredText(payload, field, maximum) {
  const value = String(payload[field] ?? '').trim();
  if (!value) throw new Error(`${field} es obligatorio.`);
  if (value.length > maximum) throw new Error(`${field} debe tener máximo ${maximum} caracteres.`);
  return value;
}

function toBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hashPassword(password, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const passwordKey = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt,
    iterations: PBKDF2_ITERATIONS,
  }, passwordKey, 256);
  return {
    algorithm: 'PBKDF2-SHA-256',
    iterations: PBKDF2_ITERATIONS,
    salt: toBase64(salt),
    hash: toBase64(new Uint8Array(hash)),
  };
}

function equalBytes(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function verifyPassword(password, passwordData) {
  try {
    if (!passwordData || passwordData.algorithm !== 'PBKDF2-SHA-256') return false;
    const salt = fromBase64(passwordData.salt);
    const expected = fromBase64(passwordData.hash);
    const derived = await hashPassword(password, salt);
    return equalBytes(fromBase64(derived.hash), expected);
  } catch {
    return false;
  }
}

function publicUser(user) {
  return { id: user.id, fullName: user.fullName, email: user.email };
}

async function readPayload(request) {
  try {
    const payload = await request.json();
    if (!payload || Array.isArray(payload) || typeof payload !== 'object') throw new Error();
    return payload;
  } catch {
    throw new Error('Envía un objeto JSON válido.');
  }
}

function userKey(email) {
  return `user:${email}`;
}

async function register(request, env) {
  const payload = await readPayload(request);
  const fullName = cleanRequiredText(payload, 'fullName', 120);
  const email = cleanRequiredText(payload, 'email', 190).toLowerCase();
  const password = String(payload.password ?? '');
  if (!EMAIL_PATTERN.test(email)) throw new Error('El correo no tiene un formato válido.');
  if (password.length < PASSWORD_MIN_LENGTH) throw new Error(`La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`);
  if (password.length > 256) throw new Error('La contraseña es demasiado larga.');
  if (await env.USERS.get(userKey(email))) throw new Error('Ya existe una cuenta con ese correo.');

  const user = {
    id: crypto.randomUUID(),
    fullName,
    email,
    password: await hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  await env.USERS.put(userKey(email), JSON.stringify(user));
  return publicUser(user);
}

async function login(request, env) {
  const payload = await readPayload(request);
  const email = cleanRequiredText(payload, 'email', 190).toLowerCase();
  const password = String(payload.password ?? '');
  const storedUser = await env.USERS.get(userKey(email));
  if (!storedUser) throw new Error('Correo o contraseña incorrectos.');
  const user = JSON.parse(storedUser);
  if (!(await verifyPassword(password, user.password))) throw new Error('Correo o contraseña incorrectos.');
  return publicUser(user);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }
    if (!isAllowedOrigin(request, env)) {
      return json(request, env, 403, { ok: false, message: 'Origen no autorizado.' });
    }
    if (request.method !== 'POST' || !['/api/auth/register', '/api/auth/login'].includes(url.pathname)) {
      return json(request, env, 404, { ok: false, message: 'Ruta no encontrada.' });
    }
    try {
      const user = url.pathname === '/api/auth/register'
        ? await register(request, env)
        : await login(request, env);
      const status = url.pathname === '/api/auth/register' ? 201 : 200;
      return json(request, env, status, {
        ok: true,
        message: status === 201 ? 'Cuenta creada correctamente.' : 'Inicio de sesión correcto.',
        user,
      });
    } catch (error) {
      return json(request, env, 422, { ok: false, message: error.message || 'No se pudo procesar la solicitud.' });
    }
  },
};
