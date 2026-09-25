import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  organizationId: string;
  role: string;
}

const getAccessSecret = (): string => {
  return process.env.JWT_ACCESS_SECRET || 'default_jwt_access_secret_for_development_and_testing';
};

const getRefreshSecret = (): string => {
  return process.env.JWT_REFRESH_SECRET || 'default_jwt_refresh_secret_for_development_and_testing';
};

export const signAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, getAccessSecret(), { expiresIn: '15m' });
};

export const signRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, getRefreshSecret(), {
    expiresIn: '7d',
  });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, getAccessSecret()) as JwtPayload;
  return {
    userId: decoded.userId,
    organizationId: decoded.organizationId,
    role: decoded.role,
  };
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, getRefreshSecret()) as JwtPayload;
  return {
    userId: decoded.userId,
    organizationId: decoded.organizationId,
    role: decoded.role,
  };
};
