import { Controller, Get, Post, Patch, Param, Body, Delete } from '@nestjs/common';
import { OrdersService } from './order.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  @Get()
  getAll() {
    // Fetch all orders
    return this.ordersService.findAll();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    // Fetch single order
    return this.ordersService.findOne(id);
  }

  @Post()
  create(@Body() dto: { name: string}) {
    const order = this.ordersService.create(dto);
    // Emit event for async consumers
    this.eventEmitter.emit('order.created', order);
    return order;
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: { name: string}) {
    return this.ordersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}