export async function GET(
  request: Request,
  { params }: { params: { kod_pkd: string; rok: string } }
) {
  return Response.json(params);
}