import { NextRequest } from 'next/server';
import { cookies, headers } from 'next/headers';

export async function GET(request: NextRequest) {
  return Response.json({ message: "All PKD" });
}
