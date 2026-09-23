import { Request, Response, NextFunction } from 'express';
import { loginSchema, registerSchema } from '../validators/auth.validator';
import { loginUser, registerUser } from '../services/auth.service';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedInput = registerSchema.parse(req.body);
    const user = await registerUser(validatedInput);

    res.status(201).json({
      message: 'User registered successfully',
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedInput = loginSchema.parse(req.body);
    const tokens = await loginUser(validatedInput);

    res.status(200).json(tokens);
  } catch (error) {
    next(error);
  }
};
