import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export function GET(): NextResponse {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() ?? '';
  const publisherId = /^ca-pub-(\d+)$/.exec(clientId)?.[1];

  if (!publisherId) {
    return new NextResponse('AdSense publisher ID is not configured.\n', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return new NextResponse(`google.com, pub-${publisherId}, DIRECT, f08c47fec0942fa0\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
