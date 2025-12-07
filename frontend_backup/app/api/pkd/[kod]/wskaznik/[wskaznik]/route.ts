export async function GET(
   req: Request,
   { params }: { params: { kod: string; wskaznik: string } }
) {
   const { kod, wskaznik } = params;

   const url = `${process.env.API_URL}:${process.env.API_PORT}/api/pkd/${kod}/wskaznik/${wskaznik}`;

   const response = await fetch(url);
   const data = await response.json();

   return Response.json(data);
}

export async function POST(
   req: Request,
   { params }: { params: { kod: string; wskaznik: string } }
) {
   const { kod, wskaznik } = params;

   const url = `${process.env.API_URL}:${process.env.API_PORT}/api/pkd/${kod}/wskaznik/${wskaznik}`;

   const response = await fetch(url, {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json',
      },
      body: await req.text(),
   });

   const data = await response.json();

   return Response.json(data);
}
