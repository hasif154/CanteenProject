import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { regNo, newPassword } = await req.json();

  if (!regNo || !newPassword) {
    return NextResponse.json({ success: false, message: 'Register Number and new password are required' }, { status: 400 });
  }
  if (newPassword.length < 4) {
    return NextResponse.json({ success: false, message: 'Password must be at least 4 characters' }, { status: 400 });
  }

  try {
    const { data: student, error } = await supabase
      .from('students')
      .select('register_number, name')
      .eq('register_number', regNo.trim().toUpperCase())
      .single();

    if (error || !student) {
      return NextResponse.json({ success: false, message: 'Invalid Register Number' }, { status: 404 });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    const { error: updateError } = await supabase
      .from('students')
      .update({ password_hash: hash })
      .eq('register_number', student.register_number);

    if (updateError) {
      return NextResponse.json({ success: false, message: 'Failed to update password' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
