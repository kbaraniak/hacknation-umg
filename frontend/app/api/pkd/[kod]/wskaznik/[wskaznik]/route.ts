export async function GET(
  request: Request,
  { params }: { params: { kod: string; wskaznik: string } }
) {
  return Response.json(params);
}

export async function POST(
  request: Request,
  { params }: { params: { kod: string; wskaznik: string } }
) {
  const body = await request.json();
  return Response.json({ ...params, body });
}
