import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { store } from '@/lib/store';

export async function POST(req: NextRequest) {
  const { username, password, canteenId } = await req.json();

  if (!username || !password || !canteenId) {
    return NextResponse.json({ success: false, message: 'Username, password and canteen are required' }, { status: 400 });
  }

  try {
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !admin) {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }
  } catch (err) {
    console.error('Admin login error:', err);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }

  await store.ensureMenu();

  if (!store.canteenMenus[canteenId]) {
    return NextResponse.json({ success: false, message: 'Invalid canteen' }, { status: 400 });
  }

  const token = store.createAdminSession(canteenId);
  const canteen = store.canteenMenus[canteenId];

  const res = NextResponse.json({
    success: true,
    token,
    canteenId,
    canteenName: canteen.name,
    message: `Logged in to ${canteen.name}`,
  });

  res.cookies.set('admin_token', token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 8 });
  return res;
}
