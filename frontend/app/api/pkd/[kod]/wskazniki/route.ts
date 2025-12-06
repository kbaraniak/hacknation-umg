export async function GET(
  req: Request,
  { params }: { params: Promise<{ kod: string }> }
) {
  const { kod } = await params;

  const url = `${process.env.API_URL}:${process.env.API_PORT}/api/pkd/${kod}/wskazniki`;

  const response = await fetch(url);
  const data = await response.json();

  return Response.json(data);
}
