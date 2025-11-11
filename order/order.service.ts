import { Injectable } from '@nestjs/common';

@Injectable()
export class OrdersService {
  private orders: any[] = [];

  findAll() {
    return this.orders;
  }

  findOne(id: string) {
    return this.orders.find(o => o.id === id);
  }

  create(dto: { name: string }) {
    const order = { id: Date.now().toString(), ...dto };
    this.orders.push(order);
    return order;
  }

  update(id: string, dto: { name: string }) {
    const index = this.orders.findIndex(o => o.id === id);
    if (index !== -1) this.orders[index] = { ...this.orders[index], ...dto };
    return this.orders[index];
  }

  remove(id: string) {
    this.orders = this.orders.filter(o => o.id !== id);
    return { deleted: true };
  }
}
