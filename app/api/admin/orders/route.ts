import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { store } from '@/lib/store';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const { canteenId } = auth.session!;
  const orders = Array.from(store.orders.values()).filter(
    (o) => o.canteen_id === canteenId && o.payment_status === 'PAID'
  );
  return NextResponse.json({ success: true, orders });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const { canteenId } = auth.session!;
  const { order_id } = await req.json();

  if (!order_id) return NextResponse.json({ success: false, error: 'order_id required' }, { status: 400 });

  const order = store.orders.get(order_id.toLowerCase());
  if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
  if (order.canteen_id !== canteenId) return NextResponse.json({ success: false, error: 'Order belongs to different canteen' }, { status: 403 });

  order.order_status = 'COLLECTED';
  order.collected_at = new Date().toISOString();

  return NextResponse.json({ success: true, order, message: 'Order marked as collected' });
}
