import { Request, Response, NextFunction } from 'express';
import { registerSchema } from '../validators/auth.validator';
import { registerUser } from '../services/auth.service';

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
