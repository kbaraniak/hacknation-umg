import { NextRequest } from 'next/server';
import { cookies, headers } from 'next/headers';

export async function GET(request: NextRequest) {
  const url = `${process.env.API_URL}:${process.env.API_PORT}/api/pkd`;

  const response = await fetch(url);
  const data = await response.json();

  return Response.json(data);
}
