'use strict';

/**
 * API de cuentas de Mystique One integrada con Supabase.
 * Ejecuta: node server.js
 */
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 8000);
const FRONTEND_DIR = path.resolve(__dirname, '..');
const MAX_BODY_BYTES = 16 * 1024;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Configuración de Supabase (asegúrate de definir estas variables de entorno o reemplazarlas)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://olklsdzxlugrgxlelrgt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_6_bvuF40nccO62w1Lm6t4w_-8LvIRki';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class ValidationError extends Error {}

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jfif': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function publicUser(user) {
  return { 
    id: user.id, 
    fullName: user.nombre_completo || user.fullName, 
    email: user.email 
  };
}

function scrypt(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEY_LENGTH, SCRYPT_OPTIONS, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const passwordHash = await scrypt(password, salt);
  return JSON.stringify({
    algorithm: 'scrypt',
    parameters: { N: SCRYPT_OPTIONS.N, r: SCRYPT_OPTIONS.r, p: SCRYPT_OPTIONS.p, keyLength: SCRYPT_KEY_LENGTH },
    salt: salt.toString('base64'),
    hash: passwordHash.toString('base64'),
  });
}

async function verifyPassword(password, passwordDataJson) {
  try {
    const passwordData = typeof passwordDataJson === 'string' ? JSON.parse(passwordDataJson) : passwordDataJson;
    if (!passwordData || passwordData.algorithm !== 'scrypt') return false;
    const { N, r, p, keyLength } = passwordData.parameters || {};
    if (![N, r, p, keyLength].every(Number.isSafeInteger)) return false;
    const salt = Buffer.from(passwordData.salt, 'base64');
    const expected = Buffer.from(passwordData.hash, 'base64');
    if (salt.length !== 16 || expected.length !== keyLength) return false;
    const candidate = await new Promise((resolve, reject) => {
      crypto.scrypt(password, salt, keyLength, { N, r, p, maxmem: 64 * 1024 * 1024 }, (error, key) => {
        if (error) reject(error);
        else resolve(key);
      });
    });
    return crypto.timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

function requiredText(payload, field, maximum) {
  const value = String(payload[field] ?? '').trim();
  if (!value) throw new ValidationError(`${field} es obligatorio.`);
  if (value.length > maximum) throw new ValidationError(`${field} debe tener máximo ${maximum} caracteres.`);
  return value;
}

function validateRegistration(payload) {
  const fullName = requiredText(payload, 'fullName', 120);
  const email = requiredText(payload, 'email', 190).toLowerCase();
  const password = String(payload.password ?? '');
  if (!EMAIL_PATTERN.test(email)) throw new ValidationError('El correo no tiene un formato válido.');
  if (password.length < 10) throw new ValidationError('La contraseña debe tener al menos 10 caracteres.');
  if (password.length > 256) throw new ValidationError('La contraseña es demasiado larga.');
  return { fullName, email, password };
}

async function registerUser(payload) {
  const { fullName, email, password } = validateRegistration(payload);

  // Verificar si ya existe el correo en la tabla 'Emprendedores'
  const { data: existingUsers, error: searchError } = await supabase
    .from('Emprendedores')
    .select('email')
    .eq('email', email);

  if (searchError) {
    throw new Error('Error al consultar la base de datos.');
  }

  if (existingUsers && existingUsers.length > 0) {
    throw new ValidationError('Ya existe una cuenta con ese correo.');
  }

  const hashedPassword = await hashPassword(password);

  // Insertar en Supabase mapeando a las columnas de la tabla: nombre_completo, email, pass
  const { data, error } = await supabase
    .from('Emprendedores')
    .insert([
      { 
        nombre_completo: fullName, 
        email: email, 
        pass: hashedPassword 
      }
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`No se pudo registrar el usuario en Supabase: ${error.message}`);
  }

  return publicUser(data);
}

async function loginUser(payload) {
  const email = requiredText(payload, 'email', 190).toLowerCase();
  const password = String(payload.password ?? '');

  // Buscar el usuario por correo en Supabase
  const { data: user, error } = await supabase
    .from('Emprendedores')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user) {
    throw new ValidationError('Correo o contraseña incorrectos.');
  }

  const isValid = await verifyPassword(password, user.pass);
  if (!isValid) {
    throw new ValidationError('Correo o contraseña incorrectos.');
  }

  return publicUser(user);
}

function sendJson(response, status, body) {
  const encoded = Buffer.from(JSON.stringify(body));
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': encoded.length,
    'Access-Control-Allow-Origin': '*',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(encoded);
}

async function serveStatic(request, response) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    sendJson(response, 400, { ok: false, message: 'La URL no es válida.' });
    return;
  }

  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^[/\\]+/, '');
  const filePath = path.resolve(FRONTEND_DIR, relativePath);
  if (!filePath.startsWith(`${FRONTEND_DIR}${path.sep}`)) {
    sendJson(response, 403, { ok: false, message: 'Acceso no permitido.' });
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    response.writeHead(200, {
      'Content-Type': CONTENT_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Content-Length': file.length,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': path.extname(filePath).toLowerCase() === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    response.end(file);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR') {
      sendJson(response, 404, { ok: false, message: 'Archivo no encontrado.' });
      return;
    }
    console.error('Error al servir el frontend:', error.message);
    sendJson(response, 500, { ok: false, message: 'No se pudo cargar el sitio.' });
  }
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let received = 0;
    const chunks = [];
    request.on('data', (chunk) => {
      received += chunk.length;
      if (received > MAX_BODY_BYTES) {
        reject(new ValidationError('El cuerpo de la solicitud es demasiado grande.'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      try {
        const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!payload || Array.isArray(payload) || typeof payload !== 'object') throw new Error();
        resolve(payload);
      } catch {
        reject(new ValidationError('Envía un objeto JSON válido.'));
      }
    });
    request.on('error', reject);
  });
}

async function handler(request, response) {
  if (request.method === 'OPTIONS') {
    response.writeHead(24, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    response.end();
    return;
  }
  if (request.method === 'GET' && request.url === '/api/health') {
    sendJson(response, 200, { ok: true, service: 'mystique-accounts-supabase' });
    return;
  }
  if (request.method === 'GET') {
    await serveStatic(request, response);
    return;
  }
  if (request.method !== 'POST' || !['/api/auth/register', '/api/auth/login'].includes(request.url)) {
    sendJson(response, 404, { ok: false, message: 'Ruta no encontrada.' });
    return;
  }
  try {
    const payload = await readJson(request);
    const user = request.url === '/api/auth/register'
      ? await registerUser(payload)
      : await loginUser(payload);
    const status = request.url === '/api/auth/register' ? 201 : 200;
    sendJson(response, status, { ok: true, message: status === 201 ? 'Cuenta creada correctamente.' : 'Inicio de sesión correcto.', user });
  } catch (error) {
    if (error instanceof ValidationError) {
      sendJson(response, 422, { ok: false, message: error.message });
    } else {
      console.error('Error interno de cuentas:', error.message);
      sendJson(response, 500, { ok: false, message: 'No se pudo procesar la solicitud.' });
    }
  }
}

function createServer() {
  return http.createServer((request, response) => { void handler(request, response); });
}

if (require.main === module) {
  createServer().listen(PORT, HOST, () => {
    console.log(`API disponible en http://${HOST}:${PORT}`);
  });
}

module.exports = { createServer, hashPassword, verifyPassword, registerUser, loginUser };