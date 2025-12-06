export async function GET(
    req: Request,
    { params }: { params: { kod_pkd: string; rok: string } }
) {
    const { kod_pkd, rok } = params;

    const url = `${process.env.API_URL}:${process.env.API_PORT}/api/insolvency/${kod_pkd}/${rok}`;

    const response = await fetch(url);
    const data = await response.json();

    return Response.json(data);
}