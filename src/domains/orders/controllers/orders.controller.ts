import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateOrderDto } from '../dto/request/create-order.dto';
import { GetOrdersQueryDto } from '../dto/request/get-orders-query.dto';
import { UpdateOrderDto } from '../dto/request/update-order.dto';
import { OrdersService } from '../services/orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createOrder(@Body() dto: CreateOrderDto) {
    const dummyUserId = 1;
    return this.ordersService.createOrder(dummyUserId, dto);
  }

  @Get()
  async getOrders(@Query() query: GetOrdersQueryDto) {
    const dummyUserId = 1;
    return this.ordersService.getOrders(dummyUserId, query);
  }

  @Get(':id')
  async getOrdersById(@Param('id', ParseIntPipe) id: number) {
    const dummyUserId = 1;
    return this.ordersService.getOrderById(id, dummyUserId);
  }

  @Patch(':id')
  async updateOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderDto,
  ) {
    const dummyUserId = 1;
    return this.ordersService.updateOrder(id, dummyUserId, dto);
  }

  @Delete(':id')
  async cancelOrder(@Param('id', ParseIntPipe) id: number) {
    const dummyUserId = 1;
    return this.ordersService.cancelOrder(id, dummyUserId);
  }
}
