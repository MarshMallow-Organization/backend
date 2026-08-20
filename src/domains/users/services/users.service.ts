import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  UserInfoResponseDto,
  UserInfoUpdateResponseDto,
} from '../dto/response/users-info-response.dto';
import { BusinessException } from 'src/common/exception/businessException';
import {
  UsersInfoErrorCode,
  UsersInfoUpdateErrorCode,
} from '../error/users-info.error';
import { UpdateUsersInfoDto } from '../dto/request/update-users-info.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserInfo(userId: number): Promise<UserInfoResponseDto> {
    // 사용자의 ID, email, 이름, 방문횟수
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        visitCount: true,
      },
    });
    if (!user) {
      throw new BusinessException(UsersInfoErrorCode.USER_NOT_FOUND, {
        userId,
      });
    }

    // 사용자의 프로필 이미지
    const profilePic = await this.prisma.profilePic.findUnique({
      where: {
        userId: userId,
      },
      select: {
        image: {
          select: {
            imageUrl: true,
          },
        },
      },
    });

    // 사용자의 토스 계좌 연동 여부, 일시
    const tossUserAccount = await this.prisma.tossAccount.findUnique({
      where: {
        userId: userId,
      },
      select: {
        createdAt: true,
      },
    });

    //  전체 거래 수
    // 명세서 상으로는 삭제 여부를 확인하는게 있었는데 현재는 삭제안함
    const totalTradesCount = await this.prisma.trade.count({
      where: {
        userId: userId,
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      profileImageUrl: profilePic?.image.imageUrl ?? null,
      tossApi: {
        connected: tossUserAccount != null,
        connectedAt: tossUserAccount?.createdAt.toISOString() ?? null,
      },
      visitCount: user.visitCount,
      totalTradeCount: totalTradesCount,
    };
  }

  async updateUserInfo(
    userId: number,
    dto: UpdateUsersInfoDto,
  ): Promise<UserInfoUpdateResponseDto> {
    // 사용자가 빈칸을 입력한 경우 예외처리
    if (dto.name == null && dto.profileImageUrl == null) {
      throw new BusinessException(
        UsersInfoUpdateErrorCode.BAD_REQUEST_NULL_VALUE,
      );
    }

    // name과 프로필 url로 db 최신화
    const updatedUser = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.profileImageUrl != null && {
          profilePic: {
            upsert: {
              // 기존 프로필 이미지가 없는 경우
              create: {
                image: {
                  create: {
                    imageUrl: dto.profileImageUrl,
                  },
                },
              },

              // 기존 프로필 이미지가 있는 경우
              update: {
                image: {
                  update: {
                    imageUrl: dto.profileImageUrl,
                  },
                },
              },
            },
          },
        }),
      },
      select: {
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
      },
    });
    return {
      id: updatedUser.id,
      name: updatedUser.name,
      profileImageUrl: updatedUser.profilePic?.image.imageUrl ?? null,
    };
  }
}
