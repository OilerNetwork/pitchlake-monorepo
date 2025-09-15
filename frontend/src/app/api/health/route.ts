import { NextResponse } from 'next/server';

export async function GET() {
  return new NextResponse("healthy", { status: 200 });
} 