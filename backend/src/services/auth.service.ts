import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { pool } from '../config/db';
import { env } from '../config/env';
import { HttpError } from '../errors/http-error';
import type { AuthUser, Role, UserRow } from '../types/auth';

function toAuthUser(row: Pick<UserRow, 'id' | 'full_name' | 'email' | 'role'>): AuthUser {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
  };
}

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const result = await pool.query<UserRow>(
    `SELECT id, full_name, email, password_hash, role
     FROM users
     WHERE email = $1 AND deleted_at IS NULL`,
    [email],
  );

  const user = result.rows[0];
  if (!user) {
    throw new HttpError(401, 'Email ou mot de passe incorrect.');
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new HttpError(401, 'Email ou mot de passe incorrect.');
  }

  const signOptions: SignOptions = {
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
  };
  const token = jwt.sign({ sub: user.id, role: user.role satisfies Role }, env.jwtSecret, signOptions);

  return { token, user: toAuthUser(user) };
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  const result = await pool.query<UserRow>(
    `SELECT id, full_name, email, role
     FROM users
     WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );

  const user = result.rows[0];
  if (!user) {
    return null;
  }

  return toAuthUser(user);
}
