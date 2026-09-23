import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { comparePassword, hashPassword, hashToken } from '../lib/hash';
import { signAccessToken, signRefreshToken } from '../lib/jwt';
import { AppError } from '../middleware/errorHandler';
import { LoginInput, RegisterInput } from '../validators/auth.validator';

export const registerUser = async (input: RegisterInput) => {
  const organizationExists = await prisma.organization.findUnique({
    where: { id: input.organizationId },
  });

  if (!organizationExists) {
    throw new AppError('Organization not found', 404, 'ORGANIZATION_NOT_FOUND');
  }

  const hashedPassword = await hashPassword(input.password);

  try {
    const user = await prisma.user.create({
      data: {
        organizationId: input.organizationId,
        email: input.email.toLowerCase().trim(),
        passwordHash: hashedPassword,
        name: input.name.trim(),
        role: input.role,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(
        'User with this email already exists in this organization',
        409,
        'EMAIL_EXISTS'
      );
    }
    throw error;
  }
};

export const loginUser = async (input: LoginInput) => {
  const normalizedEmail = input.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: {
      organizationId_email: {
        organizationId: input.organizationId,
        email: normalizedEmail,
      },
    },
  });

  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const isPasswordValid = await comparePassword(input.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const payload = {
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const tokenHash = hashToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken,
  };
};
