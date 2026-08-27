import jwt from 'jsonwebtoken';

import { getJwtConfig } from '../config/auth.js';

const rejectAuthentication = (response) => {
  response.status(401).json({ message: 'Authentication required' });
};

const authenticateJwt = (request, response, next) => {
  const authorization = request.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    rejectAuthentication(response);
    return;
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    rejectAuthentication(response);
    return;
  }

  let jwtConfig;
  try {
    jwtConfig = getJwtConfig();
  } catch (error) {
    next(error);
    return;
  }

  try {
    const payload = jwt.verify(token, jwtConfig.secret);
    const userId = Number(payload.sub);
    if (!Number.isSafeInteger(userId) || userId < 1 || typeof payload.role !== 'string') {
      rejectAuthentication(response);
      return;
    }

    request.user = { id: userId, role: payload.role };
    next();
  } catch {
    rejectAuthentication(response);
  }
};

export default authenticateJwt;
