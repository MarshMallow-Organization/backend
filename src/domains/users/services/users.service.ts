import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserInfoResponseDto } from '../dto/response/users-info-response.dto';
import { BusinessException } from 'src/common/exception/businessException';
import { UsersInfoErrorCode } from '../error/users-info.error';

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
}
