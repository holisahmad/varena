import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const session = await authenticateUser(email, password);
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: session,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

