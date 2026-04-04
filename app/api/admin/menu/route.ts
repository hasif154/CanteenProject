import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { store } from '@/lib/store';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const { canteenId } = auth.session!;
  const canteen = store.canteenMenus[canteenId];
  if (!canteen) return NextResponse.json({ success: false, error: 'Canteen not found' }, { status: 404 });

  return NextResponse.json({ success: true, canteenId, canteenName: canteen.name, menu: canteen.items, menuVersion: store.menuVersionCounter });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const { canteenId } = auth.session!;
  const canteen = store.canteenMenus[canteenId];
  if (!canteen) return NextResponse.json({ success: false, error: 'Canteen not found' }, { status: 404 });

  const body = await req.json();
  const { action } = body;

  if (action === 'toggle') {
    const { itemId, available } = body;
    const item = canteen.items.find((i) => i.id === itemId);
    if (!item) return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    item.available = available;
    store.menuVersionCounter++;
    await store.saveMenu();
    return NextResponse.json({ success: true, item, menuVersion: store.menuVersionCounter });
  }

  if (action === 'bulk-toggle') {
    const { available } = body;
    canteen.items.forEach((i) => (i.available = available));
    store.menuVersionCounter++;
    await store.saveMenu();
    return NextResponse.json({ success: true, menuVersion: store.menuVersionCounter });
  }

  if (action === 'add') {
    const { name, price, category, emoji, isVeg } = body;
    if (!name || !price || !category) return NextResponse.json({ success: false, error: 'name, price, category required' }, { status: 400 });

    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (canteen.items.find((i) => i.id === id || i.name.toLowerCase() === name.trim().toLowerCase())) {
      return NextResponse.json({ success: false, error: 'Item already exists' }, { status: 400 });
    }

    const newItem = { id, name: name.trim(), price: Math.round(price), category: category.trim(), emoji: emoji || null, isVeg: isVeg !== undefined ? isVeg : true, image: null, available: true };
    canteen.items.push(newItem);
    store.menuVersionCounter++;
    await store.saveMenu();
    return NextResponse.json({ success: true, item: newItem, menuVersion: store.menuVersionCounter }, { status: 201 });
  }

  if (action === 'edit') {
    const { itemId, name, price, category, emoji, isVeg } = body;
    const item = canteen.items.find((i) => i.id === itemId);
    if (!item) return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });

    if (name) item.name = name.trim();
    if (price !== undefined && typeof price === 'number' && price > 0) item.price = Math.round(price);
    if (category) item.category = category.trim();
    if (emoji !== undefined) item.emoji = emoji;
    if (isVeg !== undefined) item.isVeg = isVeg;

    store.menuVersionCounter++;
    await store.saveMenu();
    return NextResponse.json({ success: true, item, menuVersion: store.menuVersionCounter });
  }

  if (action === 'delete') {
    const { itemId } = body;
    const idx = canteen.items.findIndex((i) => i.id === itemId);
    if (idx === -1) return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    const removed = canteen.items.splice(idx, 1)[0];
    store.menuVersionCounter++;
    await store.saveMenu();
    return NextResponse.json({ success: true, removedItem: removed, menuVersion: store.menuVersionCounter });
  }

  return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
}
