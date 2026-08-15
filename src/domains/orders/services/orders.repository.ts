import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from '../dto/request/create-order.dto';
import { GetOrdersQueryDto } from '../dto/request/get-orders-query.dto';
import { UpdateOrderDto } from '../dto/request/update-order.dto';
import { OrderStatus } from 'src/generated/prisma/enums';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  // 1. (조건부)주문 생성
  async create(userId: number, dto: CreateOrderDto) {
    return await this.prisma.order.create({
      data: {
        orderType: dto.orderType,
        orderCategory: dto.orderCategory,
        tradeType: dto.tradeType,
        quantity: dto.quantity !== undefined ? dto.quantity : 1,
        price: dto.price !== undefined ? dto.price : null,
        userId: userId,
        currenciesId: dto.currenciesId,
        // 조건부 주문 데이터가 넘어온 경우 1:1 중첩 생성
        ...(dto.orderCondition && {
          orderCondition: {
            create: {
              triggerPrice: dto.orderCondition.triggerPrice,
              expiredAt: new Date(dto.orderCondition.expiredAt),
            },
          },
        }),
      },
      include: {
        orderCondition: true,
      },
    });
  }

  // 2. 주문 목록 조회
  async findAll(userId: number, query: GetOrdersQueryDto) {
    const where: Prisma.OrderWhereInput = {
      userId,
      ...(query.status && { status: query.status }),
      ...(query.orderCategory && { orderCategory: query.orderCategory }),
      ...(query.orderType && { orderType: query.orderType }),
      ...(query.tradeType && { tradeType: query.tradeType }),
    };

    return await this.prisma.order.findMany({
      where,
      include: {
        orderCondition: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // 3. 주문 단건 조회
  async findById(id: number, userId: number) {
    return await this.prisma.order.findFirst({
      where: { id, userId },
      include: {
        orderCondition: true,
      },
    });
  }

  // 4. 주문 수정
  async update(id: number, dto: UpdateOrderDto) {
    return await this.prisma.order.update({
      where: { id },
      data: {
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.orderCondition && {
          orderCondition: {
            update: {
              ...(dto.orderCondition.triggerPrice !== undefined && {
                triggerPrice: dto.orderCondition.triggerPrice,
              }),
              ...(dto.orderCondition.expiredAt && {
                expiredAt: new Date(dto.orderCondition.expiredAt),
              }),
            },
          },
        }),
      },
      include: {
        orderCondition: true,
      },
    });
  }

  // 5. 주문 취소 (status -> CANCELED로 변경)
  async cancel(id: number) {
    return await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELED,
      },
      include: {
        orderCondition: true,
      },
    });
  }
}
