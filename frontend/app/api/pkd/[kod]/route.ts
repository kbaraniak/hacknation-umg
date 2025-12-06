import { NextRequest } from 'next/server';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ kod: string }> }
) {
    const { kod } = await params;
    const url = `${process.env.API_URL}:${process.env.API_PORT}/api/pkd/${kod}`;
    const response = await fetch(url);
    const data = await response.json();
    return Response.json(data);
}
