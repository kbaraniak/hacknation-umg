export async function GET(
  request: Request,
  { params }: { params: { kod: string } }
) {
  return Response.json({ kod: params.kod, wskazniki: [] });
}
