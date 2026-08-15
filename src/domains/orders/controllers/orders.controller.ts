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
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from 'src/common/auth/authUser';
import { CurrentUser } from 'src/common/auth/currentUser.decorator';
import { StubAuthGuard } from 'src/common/auth/stubAuth.guard';
import { CreateOrderDto } from '../dto/request/create-order.dto';
import { GetOrdersQueryDto } from '../dto/request/get-orders-query.dto';
import { UpdateOrderDto } from '../dto/request/update-order.dto';
import { OrdersService } from '../services/orders.service';

@Controller('orders')
@UseGuards(StubAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createOrder(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(user.id, dto);
  }

  @Get()
  async getOrders(
    @CurrentUser() user: AuthUser,
    @Query() query: GetOrdersQueryDto,
  ) {
    return this.ordersService.getOrders(user.id, query);
  }

  @Get(':id')
  async getOrdersById(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.getOrderById(id, user.id);
  }

  @Patch(':id')
  async updateOrder(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.ordersService.updateOrder(id, user.id, dto);
  }

  @Delete(':id')
  async cancelOrder(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.cancelOrder(id, user.id);
  }
}
