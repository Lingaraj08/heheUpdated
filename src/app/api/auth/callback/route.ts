import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(new URL('/login?error=auth-failed', request.url));
    }
  }

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    console.error('Error getting session:', error);
    return NextResponse.redirect(new URL('/login?error=auth-failed', request.url));
  }

  const user = data.session.user;
  const token = data.session.access_token;

  // Here you would typically call your API to create/update user
  // with the Google auth data and username from session
  console.log('User:', user);
  console.log('Token:', token);

  return NextResponse.redirect(new URL('/', request.url));
}
