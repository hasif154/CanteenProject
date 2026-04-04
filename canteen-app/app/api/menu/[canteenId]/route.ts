import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ canteenId: string }> }
) {
  await store.ensureMenu();
  const { canteenId } = await params;
  const canteen = store.canteenMenus[canteenId];

  if (!canteen) {
    return NextResponse.json({ success: false, error: 'Canteen not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    canteenId,
    canteenName: canteen.name,
    menu: canteen.items,
    menuVersion: store.menuVersionCounter,
  });
}
