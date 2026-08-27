import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { getJwtConfig } from '../config/auth.js';
import { User } from '../models/index.js';

const serializeAuthenticatedUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

const login = async ({ email, password } = {}) => {
  if (typeof email !== 'string' || typeof password !== 'string') return null;

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) return null;

  const user = await User.findOne({ where: { email: normalizedEmail } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;

  const { secret, expiresIn } = getJwtConfig();
  const token = jwt.sign(
    { role: user.role },
    secret,
    { subject: String(user.id), expiresIn },
  );

  return { token, user: serializeAuthenticatedUser(user) };
};

export { login, serializeAuthenticatedUser };
