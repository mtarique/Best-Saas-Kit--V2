import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin-config';
import { ADMIN_EMAILS } from '@/lib/admin-config';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({
        authenticated: false,
        message: 'Not authenticated'
      }, { status: 401 });
    }

    const userEmail = session.user.email;
    const isAdmin = isAdminEmail(userEmail);

    return NextResponse.json({
      authenticated: true,
      email: userEmail,
      isAdmin: isAdmin,
      adminEmails: ADMIN_EMAILS,
      message: isAdmin 
        ? 'You have admin access' 
        : 'Your email is not in the admin list. Add it to ADMIN_EMAILS in src/lib/admin-config.ts'
    });

  } catch (error) {
    console.error('Admin check access error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

