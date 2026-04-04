import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(_req: NextRequest) {
  await store.ensureMenu();
  const canteens = Object.entries(store.canteenMenus).map(([id, c]) => ({ id, name: c.name }));
  return NextResponse.json({ success: true, canteens });
}
