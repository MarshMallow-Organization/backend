import { BusinessException } from 'src/common/exception/businessException';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const userId = 7;
  const user = {
    id: userId,
    email: 'user@example.com',
    name: '홍길동',
    visitCount: 5,
  };
  const connectedAt = new Date('2026-08-20T09:00:00.000Z');

  const findUser = jest.fn((): Promise<typeof user | null> =>
    Promise.resolve(user),
  );
  const findProfilePic = jest.fn(
    (): Promise<{ image: { imageUrl: string } } | null> =>
      Promise.resolve({
        image: { imageUrl: 'https://example.com/profile.jpg' },
      }),
  );
  const findTossAccount = jest.fn((): Promise<{ createdAt: Date } | null> =>
    Promise.resolve({ createdAt: connectedAt }),
  );
  const countTrades = jest.fn((): Promise<number> => Promise.resolve(20));
  const updateUser = jest.fn((args: unknown) => {
    void args;

    return Promise.resolve({
      id: userId,
      name: '수정된 이름',
      profilePic: {
        image: { imageUrl: 'https://example.com/updated-profile.jpg' },
      },
    });
  });

  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    findUser.mockResolvedValue(user);
    findProfilePic.mockResolvedValue({
      image: { imageUrl: 'https://example.com/profile.jpg' },
    });
    findTossAccount.mockResolvedValue({ createdAt: connectedAt });
    countTrades.mockResolvedValue(20);
    updateUser.mockResolvedValue({
      id: userId,
      name: '수정된 이름',
      profilePic: {
        image: { imageUrl: 'https://example.com/updated-profile.jpg' },
      },
    });

    const prisma = {
      user: { findUnique: findUser, update: updateUser },
      profilePic: { findUnique: findProfilePic },
      tossAccount: { findUnique: findTossAccount },
      trade: { count: countTrades },
    } as unknown as PrismaService;

    service = new UsersService(prisma);
  });

  it('사용자 정보와 연동 정보를 응답 DTO 형식으로 반환한다', async () => {
    const result = await service.getUserInfo(userId);

    expect(result).toEqual({
      id: userId,
      email: 'user@example.com',
      name: '홍길동',
      profileImageUrl: 'https://example.com/profile.jpg',
      tossApi: {
        connected: true,
        connectedAt: '2026-08-20T09:00:00.000Z',
      },
      visitCount: 5,
      totalTradeCount: 20,
    });
    expect(countTrades).toHaveBeenCalledWith({ where: { userId } });
  });

  it('프로필 이미지와 토스 계좌가 없으면 null과 미연동 상태를 반환한다', async () => {
    findProfilePic.mockResolvedValue(null);
    findTossAccount.mockResolvedValue(null);
    countTrades.mockResolvedValue(0);

    const result = await service.getUserInfo(userId);

    expect(result.profileImageUrl).toBeNull();
    expect(result.tossApi).toEqual({
      connected: false,
      connectedAt: null,
    });
    expect(result.totalTradeCount).toBe(0);
  });

  it('사용자가 존재하지 않으면 USER_NOT_FOUND를 던지고 추가 조회를 하지 않는다', async () => {
    findUser.mockResolvedValue(null);

    try {
      await service.getUserInfo(userId);
      throw new Error('Expected USER_NOT_FOUND BusinessException');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(BusinessException);

      if (!(error instanceof BusinessException)) {
        throw error;
      }

      expect(error.definition.code).toBe('USER_NOT_FOUND');
      expect(error.labels).toEqual({ userId });
    }

    expect(findProfilePic).not.toHaveBeenCalled();
    expect(findTossAccount).not.toHaveBeenCalled();
    expect(countTrades).not.toHaveBeenCalled();
  });

  describe('updateUserInfo', () => {
    const profileImageUrl = 'https://example.com/updated-profile.jpg';
    const responseSelect = {
      id: true,
      name: true,
      profilePic: {
        select: {
          image: {
            select: {
              imageUrl: true,
            },
          },
        },
      },
    };

    it('이름만 전달하면 이름만 수정한다', async () => {
      const result = await service.updateUserInfo(userId, {
        name: '수정된 이름',
      });

      expect(updateUser).toHaveBeenCalledWith({
        where: { id: userId },
        data: { name: '수정된 이름' },
        select: responseSelect,
      });
      expect(result).toEqual({
        id: userId,
        name: '수정된 이름',
        profileImageUrl,
      });
    });

    it('프로필 이미지 URL만 전달하면 이미지 관계를 upsert한다', async () => {
      await service.updateUserInfo(userId, { profileImageUrl });

      expect(updateUser).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          profilePic: {
            upsert: {
              create: {
                image: {
                  create: { imageUrl: profileImageUrl },
                },
              },
              update: {
                image: {
                  update: { imageUrl: profileImageUrl },
                },
              },
            },
          },
        },
        select: responseSelect,
      });
    });

    it('한 필드가 null이면 유효한 다른 필드만 수정한다', async () => {
      await service.updateUserInfo(userId, {
        name: null as unknown as string,
        profileImageUrl,
      });

      const updateArgument = updateUser.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(updateArgument.data).not.toHaveProperty('name');
      expect(updateArgument.data).toHaveProperty('profilePic');
    });

    it('수정할 값이 없으면 BAD_REQUEST_NULL_VALUE를 던진다', async () => {
      try {
        await service.updateUserInfo(userId, {});
        throw new Error('Expected BAD_REQUEST_NULL_VALUE BusinessException');
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(BusinessException);

        if (!(error instanceof BusinessException)) {
          throw error;
        }

        expect(error.definition.code).toBe('BAD_REQUEST_NULL_VALUE');
      }

      expect(updateUser).not.toHaveBeenCalled();
    });
  });
});
