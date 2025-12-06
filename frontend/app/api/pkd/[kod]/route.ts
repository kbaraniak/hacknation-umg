import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { kod: string } }
) {
  return Response.json({ kod: params.kod });
}
