import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { store } from '@/lib/store';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  store.destroyAdminSession(auth.token!);
  const res = NextResponse.json({ success: true, message: 'Logged out' });
  res.cookies.delete('admin_token');
  return res;
}
