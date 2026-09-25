process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'test_jwt_access_secret_key_32bytes_long';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test_jwt_refresh_secret_key_32bytes_long';

import request from 'supertest';
import express, { Express } from 'express';
import { Prisma } from '@prisma/client';
import healthRouter from '../routes/health.routes';
import authRouter from '../routes/auth.routes';
import { errorHandler } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';
import { hashPassword, hashToken } from '../lib/hash';
import { signAccessToken, signRefreshToken } from '../lib/jwt';

// Mock Prisma client
jest.mock('../lib/prisma', () => ({
  prisma: {
    organization: {
      findUnique: jest.fn(),
    },
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Setup Express Test App
const app: Express = express();
app.use(express.json());
app.use('/', healthRouter);
app.use('/api/auth', authRouter);
app.use(errorHandler);

describe('Authentication Flow Integration Tests', () => {
  const mockOrgId = 'org-cuid-123';
  const mockUserId = 'user-cuid-456';
  const mockEmail = 'doctor@careflow.com';
  const rawPassword = 'Password123!';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully (201)', async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: mockOrgId,
        name: 'CareFlow Hospital',
        slug: 'careflow-hospital',
      });

      const hashedPassword = await hashPassword(rawPassword);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: mockUserId,
        organizationId: mockOrgId,
        email: mockEmail,
        passwordHash: hashedPassword,
        name: 'Dr. Sarah',
        role: 'DOCTOR',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app).post('/api/auth/register').send({
        organizationId: mockOrgId,
        email: mockEmail,
        password: rawPassword,
        name: 'Dr. Sarah',
        role: 'DOCTOR',
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body.user).toHaveProperty('id', mockUserId);
      expect(response.body.user).toHaveProperty('email', mockEmail);
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should return 409 Conflict for duplicate email in the same organization', async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: mockOrgId,
        name: 'CareFlow Hospital',
        slug: 'careflow-hospital',
      });

      const p2002Error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.22.0',
      });
      (prisma.user.create as jest.Mock).mockRejectedValue(p2002Error);

      const response = await request(app).post('/api/auth/register').send({
        organizationId: mockOrgId,
        email: mockEmail,
        password: rawPassword,
        name: 'Dr. Sarah',
        role: 'DOCTOR',
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toEqual({
        message: 'User with this email already exists in this organization',
        code: 'EMAIL_EXISTS',
      });
    });
  });

  describe('POST /api/auth/login', () => {
    it('should log in successfully with valid credentials (200)', async () => {
      const hashedPassword = await hashPassword(rawPassword);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserId,
        organizationId: mockOrgId,
        email: mockEmail,
        passwordHash: hashedPassword,
        name: 'Dr. Sarah',
        role: 'DOCTOR',
      });

      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({
        id: 'token-id-1',
        userId: mockUserId,
        tokenHash: 'hashed-refresh-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        revokedAt: null,
      });

      const response = await request(app).post('/api/auth/login').send({
        organizationId: mockOrgId,
        email: mockEmail,
        password: rawPassword,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });

    it('should return 401 Unauthorized for wrong password', async () => {
      const hashedPassword = await hashPassword(rawPassword);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserId,
        organizationId: mockOrgId,
        email: mockEmail,
        passwordHash: hashedPassword,
        role: 'DOCTOR',
      });

      const response = await request(app).post('/api/auth/login').send({
        organizationId: mockOrgId,
        email: mockEmail,
        password: 'WrongPassword!',
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toEqual({
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    });
  });

  describe('GET /api/auth/me (Authenticate Middleware)', () => {
    it('should reject request without Authorization header (401)', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toEqual({
        message: 'Authentication token missing or malformed',
        code: 'UNAUTHORIZED',
      });
    });

    it('should reject request with malformed or invalid token (401)', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.value');

      expect(response.status).toBe(401);
      expect(response.body.error).toEqual({
        message: 'Invalid or expired authentication token',
        code: 'UNAUTHORIZED',
      });
    });

    it('should accept valid access token and return user payload (200)', async () => {
      const tokenPayload = {
        userId: mockUserId,
        organizationId: mockOrgId,
        role: 'DOCTOR',
      };
      const validAccessToken = signAccessToken(tokenPayload);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(tokenPayload);
    });
  });

  describe('POST /api/auth/refresh & Rotation', () => {
    it('should successfully refresh tokens with token rotation (200)', async () => {
      const tokenPayload = {
        userId: mockUserId,
        organizationId: mockOrgId,
        role: 'DOCTOR',
      };
      const validRefreshToken = signRefreshToken(tokenPayload);
      const incomingHash = hashToken(validRefreshToken);

      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'token-row-1',
        userId: mockUserId,
        tokenHash: incomingHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: null,
      });

      (prisma.$transaction as jest.Mock).mockImplementation((operations) =>
        Promise.all(operations)
      );

      const response = await request(app).post('/api/auth/refresh').send({
        refreshToken: validRefreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-row-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should reject reuse of a revoked refresh token (401)', async () => {
      const tokenPayload = {
        userId: mockUserId,
        organizationId: mockOrgId,
        role: 'DOCTOR',
      };
      const validRefreshToken = signRefreshToken(tokenPayload);
      const incomingHash = hashToken(validRefreshToken);

      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'token-row-1',
        userId: mockUserId,
        tokenHash: incomingHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: new Date(Date.now() - 3600000), // Already revoked 1 hour ago
      });

      const response = await request(app).post('/api/auth/refresh').send({
        refreshToken: validRefreshToken,
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toEqual({
        message: 'Refresh token has been revoked',
        code: 'UNAUTHORIZED',
      });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should successfully revoke token on logout (204)', async () => {
      const tokenPayload = {
        userId: mockUserId,
        organizationId: mockOrgId,
        role: 'DOCTOR',
      };
      const validRefreshToken = signRefreshToken(tokenPayload);
      const incomingHash = hashToken(validRefreshToken);

      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'token-row-1',
        userId: mockUserId,
        tokenHash: incomingHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: null,
      });

      (prisma.refreshToken.update as jest.Mock).mockResolvedValue({});

      const response = await request(app).post('/api/auth/logout').send({
        refreshToken: validRefreshToken,
      });

      expect(response.status).toBe(204);
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-row-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should reject refresh attempts after logout (401)', async () => {
      const tokenPayload = {
        userId: mockUserId,
        organizationId: mockOrgId,
        role: 'DOCTOR',
      };
      const validRefreshToken = signRefreshToken(tokenPayload);
      const incomingHash = hashToken(validRefreshToken);

      // Simulate state after logout: revokedAt is set
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'token-row-1',
        userId: mockUserId,
        tokenHash: incomingHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: new Date(),
      });

      const response = await request(app).post('/api/auth/refresh').send({
        refreshToken: validRefreshToken,
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toEqual({
        message: 'Refresh token has been revoked',
        code: 'UNAUTHORIZED',
      });
    });
  });
});
