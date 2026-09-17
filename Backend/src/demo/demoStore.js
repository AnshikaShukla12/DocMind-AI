/**
 * demoStore.js
 *
 * File-backed store used ONLY when DEMO_MODE=true.
 * No real credentials or API keys are stored here.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function ensureUsersFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE) || fs.readFileSync(USERS_FILE, 'utf8').trim() === '') {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
  }
}

function readUsers() {
  ensureUsersFile();
  const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  return Array.isArray(data) ? data : data.users;
}

function writeUsers(users) {
  ensureUsersFile();
  fs.writeFileSync(USERS_FILE, JSON.stringify({ users }, null, 2));
}

function makeId() {
  return `demo-user-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getJwtSecret() {
  return process.env.JWT_SECRET || 'demo-local-secret-not-for-production';
}

function getJwtExpire() {
  return process.env.JWT_EXPIRE || '30d';
}

/**
 * Register a new file-backed user.
 * Returns the user-like object (without password) and a JWT.
 */
export async function demoRegister(name, email, password) {
  if (!name || !email || !password) {
    throw new Error('Please provide name, email and password');
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const normalised = email.toLowerCase().trim();
  const users = readUsers();
  if (users.some((user) => user.email === normalised)) {
    throw new Error('A user with that email already exists (demo data)');
  }

  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(password, salt);

  const id = makeId();
  const user = {
    _id: id,
    id,
    name,
    email: normalised,
    password: hashed,
    role: 'user',
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeUsers(users);

  const token = jwt.sign({ id }, getJwtSecret(), { expiresIn: getJwtExpire() });
  return { user: sanitize(user), token };
}

/**
 * Login an existing file-backed user.
 */
export async function demoLogin(email, password) {
  if (!email || !password) {
    throw new Error('Please provide an email and password');
  }

  const normalised = email.toLowerCase().trim();
  const user = readUsers().find((candidate) => candidate.email === normalised);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign({ id: user.id }, getJwtSecret(), { expiresIn: getJwtExpire() });
  return { user: sanitize(user), token };
}

/**
 * Resolve a user by id from the JWT payload.
 */
export function demoFindById(id) {
  const user = readUsers().find((candidate) => candidate.id === id);
  return user ? sanitize(user) : null;
}

/**
 * Return user object without the hashed password.
 */
function sanitize(user) {
  const { password: _pw, ...safe } = user;
  return safe;
}
