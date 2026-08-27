import { describe, test, expect, beforeEach, vi } from 'vitest';
import prisma from '../src/core/database/prisma.client.js';
import AuthService from '../src/modules/auth/services/auth.service.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

vi.mock('bcryptjs');
vi.mock('jsonwebtoken');
vi.mock('../src/core/database/prisma.client.js', () => ({
  default: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    }
  }
}));

describe('AuthService', () => {
  let authService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'secret';
    process.env.JWT_REFRESH_SECRET = 'secret';
    authService = new AuthService();
  });

  test('register creates a new user and hashes password', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hashedPassword');
    prisma.user.create.mockResolvedValue({ id: '1', username: 'testuser' });
    jwt.sign.mockReturnValue('token');

    const result = await authService.register('testuser', 'test@test.com', 'password123');

    expect(prisma.user.create).toHaveBeenCalled();
    expect(result.id).toBe('1');
  });

  test('login generates token for valid credentials', async () => {
    const mockUser = { id: '1', username: 'testuser', password: 'hashedPassword' };
    prisma.user.findUnique.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('token');

    const result = await authService.login('test@test.com', 'password123');
    expect(result.accessToken).toBe('token');
  });
});
