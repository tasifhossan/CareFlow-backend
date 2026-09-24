import { Request, Response, NextFunction } from 'express';
import {
  logoutSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
} from '../validators/auth.validator';
import { loginUser, logoutUser, refreshTokens, registerUser } from '../services/auth.service';

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

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedInput = refreshSchema.parse(req.body);
    const tokens = await refreshTokens(validatedInput);

    res.status(200).json(tokens);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedInput = logoutSchema.parse(req.body);
    await logoutUser(validatedInput);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    next(error);
  }
};
