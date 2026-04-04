import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';

const SKIP_ACCESS_CHECK = process.env.SKIP_CANTEEN_ACCESS_CHECK === 'true';

export async function POST(req: NextRequest) {
  const { registerNumber, password } = await req.json();

  if (!registerNumber || !password) {
    return NextResponse.json(
      { success: false, message: 'Register Number and Password are required' },
      { status: 400 }
    );
  }

  const regNo = registerNumber.toString().trim();

  try {
    console.log(`🔍 Looking up student: "${regNo}"`);

    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('register_number', regNo)
      .single();

    // Log the full Supabase error for debugging
    if (error) {
      console.error(`❌ Supabase error for "${regNo}":`, JSON.stringify(error));
      return NextResponse.json(
        { success: false, message: `DB error: ${error.message} (code: ${error.code})` },
        { status: 401 }
      );
    }

    if (!student) {
      console.log(`❌ No student found for: "${regNo}"`);
      return NextResponse.json(
        { success: false, message: 'Register number not found.' },
        { status: 401 }
      );
    }

    console.log(`✅ Found student: ${student.name}, checking password...`);

    const match = await bcrypt.compare(password, student.password_hash);
    if (!match) {
      console.log(`❌ Wrong password for: ${regNo}`);
      return NextResponse.json(
        { success: false, message: 'Incorrect password.' },
        { status: 401 }
      );
    }

    if (!SKIP_ACCESS_CHECK && student.canteen_access !== true) {
      return NextResponse.json(
        { success: false, message: 'Canteen access disabled. Try during lunch hours.' },
        { status: 403 }
      );
    }

    console.log(`✅ Login success: ${student.name}`);
    return NextResponse.json({
      success: true,
      registerNumber: student.register_number,
      name: student.name,
    });

  } catch (err) {
    console.error('❌ Login exception:', err);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
