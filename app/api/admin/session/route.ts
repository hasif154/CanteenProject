import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { store } from '@/lib/store';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const { canteenId } = auth.session!;
  const canteen = store.canteenMenus[canteenId];

  return NextResponse.json({
    success: true,
    canteenId,
    canteenName: canteen?.name ?? 'Unknown',
    loginTime: auth.session!.loginTime,
  });
}
