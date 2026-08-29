import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from '../dto/request/create-order.dto';
import { GetOrdersQueryDto } from '../dto/request/get-orders-query.dto';
import { UpdateOrderDto } from '../dto/request/update-order.dto';
import { OrderCategory, OrderStatus } from 'src/generated/prisma/enums';
import { Prisma } from 'src/generated/prisma/client';
import { BusinessException } from 'src/common/exception/businessException';
import { OrdersErrorCode } from '../errors/orders.error';

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  // 1. (조건부)주문 생성
  async create(userId: number, dto: CreateOrderDto, externalOrderId?: string) {
    return await this.prisma.order.create({
      data: {
        externalOrderId: externalOrderId ?? null,
        orderType: dto.orderType,
        orderCategory: dto.orderCategory,
        tradeType: dto.tradeType,
        corpCode: dto.corpCode,
        corpName: dto.corpName,
        perAtOrder: dto.perAtOrder !== undefined ? dto.perAtOrder : null,
        pbrAtOrder: dto.pbrAtOrder !== undefined ? dto.pbrAtOrder : null,
        marketCapAtOrder:
          dto.marketCapAtOrder !== undefined ? dto.marketCapAtOrder : null,
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
        snapshot: {
          include: {
            image: true,
          },
        },
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
      ...(query.corpCode && { corpCode: query.corpCode }),
    };

    return await this.prisma.order.findMany({
      where,
      include: {
        orderCondition: true,
        snapshot: {
          include: {
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // 3. 주문 단건 조회 (id 또는 externalOrderId 기준)
  async findById(
    identifier: number | { id?: number; externalOrderId?: string },
    userId?: number,
  ) {
    const where: Prisma.OrderWhereInput =
      typeof identifier === 'number'
        ? { id: identifier, ...(userId !== undefined && { userId }) }
        : {
            ...(identifier.id !== undefined && { id: identifier.id }),
            ...(identifier.externalOrderId !== undefined && {
              externalOrderId: identifier.externalOrderId,
            }),
            ...(userId !== undefined && { userId }),
          };

    return await this.prisma.order.findFirst({
      where,
      include: {
        orderCondition: true,
        snapshot: {
          include: {
            image: true,
          },
        },
      },
    });
  }

  // 4. 주문 수정 (원자적 트랜잭션 처리)
  async update(id: number, userId: number, dto: UpdateOrderDto) {
    return await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, userId },
        include: {
          orderCondition: true,
          snapshot: {
            include: {
              image: true,
            },
          },
        },
      });

      if (!order) {
        throw new BusinessException(OrdersErrorCode.ORDER_NOT_FOUND);
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new BusinessException(OrdersErrorCode.ORDER_NOT_EDITABLE);
      }

      if (order.orderCategory === OrderCategory.GENERAL && dto.orderCondition) {
        throw new BusinessException(
          OrdersErrorCode.GENERAL_ORDER_CANNOT_HAVE_CONDITION,
        );
      }

      // 상태가 PENDING인 경우에만 원자적 업데이트 수행
      const { count } = await tx.order.updateMany({
        where: {
          id,
          userId,
          status: OrderStatus.PENDING,
        },
        data: {
          ...(dto.externalOrderId !== undefined && {
            externalOrderId: dto.externalOrderId,
          }),
          ...(dto.corpCode !== undefined && { corpCode: dto.corpCode }),
          ...(dto.corpName !== undefined && { corpName: dto.corpName }),
          ...(dto.perAtOrder !== undefined && { perAtOrder: dto.perAtOrder }),
          ...(dto.pbrAtOrder !== undefined && { pbrAtOrder: dto.pbrAtOrder }),
          ...(dto.marketCapAtOrder !== undefined && {
            marketCapAtOrder: dto.marketCapAtOrder,
          }),
          ...(dto.quantity !== undefined && { quantity: dto.quantity }),
          ...(dto.price !== undefined && { price: dto.price }),
          ...(dto.currenciesId !== undefined && {
            currenciesId: dto.currenciesId,
          }),
        },
      });

      if (count === 0) {
        throw new BusinessException(OrdersErrorCode.ORDER_NOT_EDITABLE);
      }

      if (dto.orderCondition && order.orderCondition) {
        await tx.orderCondition.update({
          where: { orderId: id },
          data: {
            ...(dto.orderCondition.triggerPrice !== undefined && {
              triggerPrice: dto.orderCondition.triggerPrice,
            }),
            ...(dto.orderCondition.expiredAt && {
              expiredAt: new Date(dto.orderCondition.expiredAt),
            }),
          },
        });
      }

      return await tx.order.findFirstOrThrow({
        where: { id, userId },
        include: {
          orderCondition: true,
          snapshot: {
            include: {
              image: true,
            },
          },
        },
      });
    });
  }

  // 5. 주문 취소 (원자적 트랜잭션 처리)
  async cancel(id: number, userId: number) {
    return await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, userId },
        include: {
          orderCondition: true,
          snapshot: {
            include: {
              image: true,
            },
          },
        },
      });

      if (!order) {
        throw new BusinessException(OrdersErrorCode.ORDER_NOT_FOUND);
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new BusinessException(OrdersErrorCode.ORDER_NOT_CANCELABLE);
      }

      // 상태가 PENDING인 경우에만 CANCELED로 원자적 업데이트 수행
      const { count } = await tx.order.updateMany({
        where: {
          id,
          userId,
          status: OrderStatus.PENDING,
        },
        data: {
          status: OrderStatus.CANCELED,
        },
      });

      if (count === 0) {
        throw new BusinessException(OrdersErrorCode.ORDER_NOT_CANCELABLE);
      }

      return await tx.order.findFirstOrThrow({
        where: { id, userId },
        include: {
          orderCondition: true,
          snapshot: {
            include: {
              image: true,
            },
          },
        },
      });
    });
  }
}
