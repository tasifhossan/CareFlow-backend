import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/hash';
import { AppError } from '../middleware/errorHandler';
import { RegisterInput } from '../validators/auth.validator';

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
