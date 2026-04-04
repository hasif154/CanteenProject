import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function requireAdmin(req: NextRequest) {
  const token =
    req.headers.get('authorization')?.replace('Bearer ', '') ||
    req.cookies.get('admin_token')?.value;

  if (!token) {
    return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) };
  }

  await store.ensureMenu();
  const session = store.validateAdminSession(token);
  if (!session) {
    return { error: NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 }) };
  }

  return { session, token };
}
