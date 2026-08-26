import { Injectable } from '@nestjs/common';
import { CreateOrderDto } from '../dto/request/create-order.dto';
import { GetOrdersQueryDto } from '../dto/request/get-orders-query.dto';
import { UpdateOrderDto } from '../dto/request/update-order.dto';
import { OrderCategory, OrderType } from 'src/generated/prisma/enums';
import { BusinessException } from 'src/common/exception/businessException';
import { OrdersErrorCode } from '../errors/orders.error';
import { OrdersRepository } from './orders.repository';

@Injectable()
export class OrdersService {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  // 1. 주문 생성
  async createOrder(userId: number, dto: CreateOrderDto) {
    // 지정가 주문 시 가격 필수 검증
    if (dto.orderType === OrderType.LIMIT) {
      if (dto.price === undefined || dto.price === null || dto.price <= 0) {
        throw new BusinessException(OrdersErrorCode.LIMIT_ORDER_PRICE_REQUIRED);
      }
    }

    // 조건부 주문 유형 검사
    if (
      dto.orderCategory === OrderCategory.CONDITIONAL &&
      !dto.orderCondition
    ) {
      throw new BusinessException(OrdersErrorCode.INVALID_ORDER_CONDITION);
    }

    if (dto.orderCategory === OrderCategory.GENERAL && dto.orderCondition) {
      throw new BusinessException(
        OrdersErrorCode.GENERAL_ORDER_CANNOT_HAVE_CONDITION,
      );
    }

    return await this.ordersRepository.create(userId, dto);
  }

  // 2. 주문 목록 조회
  async getOrders(userId: number, query: GetOrdersQueryDto) {
    return await this.ordersRepository.findAll(userId, query);
  }

  // 3. 주문 단건 조회
  async getOrderById(id: number, userId: number) {
    const order = await this.ordersRepository.findById(id, userId);

    if (!order) {
      throw new BusinessException(OrdersErrorCode.ORDER_NOT_FOUND);
    }

    return order;
  }

  // 4. 주문 수정
  async updateOrder(id: number, userId: number, dto: UpdateOrderDto) {
    if (dto.price !== undefined && dto.price !== null && dto.price <= 0) {
      throw new BusinessException(OrdersErrorCode.LIMIT_ORDER_PRICE_REQUIRED);
    }

    return await this.ordersRepository.update(id, userId, dto);
  }

  // 5. 주문 취소
  async cancelOrder(id: number, userId: number) {
    return await this.ordersRepository.cancel(id, userId);
  }
}
