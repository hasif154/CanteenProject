import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import type { Order, OrderItem } from '@/types';

export async function POST(req: NextRequest) {
  await store.ensureMenu();
  const { student_id, student_name, items, canteen_id } = await req.json();

  if (!student_id || !items || items.length === 0 || !canteen_id) {
    return NextResponse.json({ success: false, error: 'student_id, canteen_id and items are required' }, { status: 400 });
  }

  const canteen = store.canteenMenus[canteen_id];
  if (!canteen) {
    return NextResponse.json({ success: false, error: 'Invalid canteen' }, { status: 400 });
  }

  const orderItems: OrderItem[] = [];
  let totalAmount = 0;

  for (const item of items) {
    const menuItem = store.getMenuItemById(canteen_id, item.menu_item_id);
    if (!menuItem) {
      return NextResponse.json({ success: false, error: `Item not found: ${item.menu_item_id}` }, { status: 400 });
    }
    if (!menuItem.available) {
      return NextResponse.json({ success: false, error: `"${menuItem.name}" is not available` }, { status: 400 });
    }
    orderItems.push({ menu_item_id: menuItem.id, name: menuItem.name, price: menuItem.price, quantity: item.quantity, emoji: menuItem.emoji });
    totalAmount += menuItem.price * item.quantity;
  }

  const orderId = store.generateOrderId();
  const order: Order = {
    id: orderId,
    canteen_id,
    canteen_name: canteen.name,
    student_id,
    student_name: student_name || 'Student',
    items: orderItems,
    total_amount: totalAmount,
    order_status: 'PLACED',
    payment_status: 'PENDING',
    created_at: new Date().toISOString(),
  };

  store.orders.set(orderId, order);
  return NextResponse.json({ success: true, order }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const studentId = req.nextUrl.searchParams.get('student_id');
  if (!studentId) {
    return NextResponse.json({ success: false, error: 'student_id required' }, { status: 400 });
  }

  const orders = Array.from(store.orders.values())
    .filter((o) => o.student_id.toUpperCase() === studentId.toUpperCase() && o.payment_status === 'PAID')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({ success: true, orders });
}
