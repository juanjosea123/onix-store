'use strict';

/**
 * API de cuentas de Mystique One sin dependencias externas.
 * Ejecuta: node server.js
 */
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 8000);
const DATA_FILE = process.env.USERS_FILE || path.join(__dirname, 'data', 'users.json');
const MAX_BODY_BYTES = 16 * 1024;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Las escrituras se encadenan para no perder registros con solicitudes simultáneas.
let storageQueue = Promise.resolve();

class ValidationError extends Error {}

function nowIso() {
  return new Date().toISOString();
}

function publicUser(user) {
  return { id: user.id, fullName: user.fullName, email: user.email };
}

async function readUsers() {
  try {
    const content = await fs.readFile(DATA_FILE, 'utf8');
    const data = JSON.parse(content);
    if (!Array.isArray(data.users)) throw new Error('Formato inválido');
    return data.users;
  } catch (error) {
    if (error.code === 'ENOENT') {
      await writeUsers([]);
      return [];
    }
    if (error instanceof SyntaxError) throw new Error('El archivo de usuarios no contiene JSON válido.');
    throw error;
  }
}

async function writeUsers(users) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const temporaryFile = `${DATA_FILE}.tmp`;
  await fs.writeFile(temporaryFile, `${JSON.stringify({ users }, null, 2)}\n`, 'utf8');
  await fs.rename(temporaryFile, DATA_FILE);
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
  return {
    algorithm: 'scrypt',
    parameters: { N: SCRYPT_OPTIONS.N, r: SCRYPT_OPTIONS.r, p: SCRYPT_OPTIONS.p, keyLength: SCRYPT_KEY_LENGTH },
    salt: salt.toString('base64'),
    hash: passwordHash.toString('base64'),
  };
}

async function verifyPassword(password, passwordData) {
  try {
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
  // No se elimina espacio al inicio/final de la contraseña: cada carácter cuenta.
  const password = String(payload.password ?? '');
  if (!EMAIL_PATTERN.test(email)) throw new ValidationError('El correo no tiene un formato válido.');
  if (password.length < 10) throw new ValidationError('La contraseña debe tener al menos 10 caracteres.');
  if (password.length > 256) throw new ValidationError('La contraseña es demasiado larga.');
  return { fullName, email, password };
}

function inStorage(operation) {
  const result = storageQueue.then(operation, operation);
  storageQueue = result.then(() => undefined, () => undefined);
  return result;
}

function registerUser(payload) {
  return inStorage(async () => {
    const { fullName, email, password } = validateRegistration(payload);
    const users = await readUsers();
    if (users.some((user) => user.email === email)) {
      throw new ValidationError('Ya existe una cuenta con ese correo.');
    }
    const user = {
      id: crypto.randomUUID(),
      fullName,
      email,
      password: await hashPassword(password),
      createdAt: nowIso(),
    };
    users.push(user);
    await writeUsers(users);
    return publicUser(user);
  });
}

async function loginUser(payload) {
  const email = requiredText(payload, 'email', 190).toLowerCase();
  const password = String(payload.password ?? '');
  const users = await storageQueue.then(readUsers);
  const user = users.find((item) => item.email === email);
  if (!user || !(await verifyPassword(password, user.password))) {
    throw new ValidationError('Correo o contraseña incorrectos.');
  }
  return publicUser(user);
}

function sendJson(response, status, body) {
  const encoded = Buffer.from(JSON.stringify(body));
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': encoded.length,
    'Access-Control-Allow-Origin': '*', // En producción, reemplazar por el dominio del frontend.
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(encoded);
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
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    response.end();
    return;
  }
  if (request.method === 'GET' && request.url === '/api/health') {
    sendJson(response, 200, { ok: true, service: 'mystique-accounts-node' });
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

module.exports = { createServer, hashPassword, verifyPassword, registerUser, loginUser, DATA_FILE };
