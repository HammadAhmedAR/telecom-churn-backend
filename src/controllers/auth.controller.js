import { login as loginService } from '../services/auth.service.js';

const login = async (request, response, next) => {
  try {
    const result = await loginService(request.body);

    if (!result) {
      response.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    response.json(result);
  } catch (error) {
    next(error);
  }
};

export { login };
