import { NextRequest } from "next/server";

const API_HOST = process.env.API_IP ?? "localhost";
const API_PORT = process.env.API_PORT ?? "8000";
const TARGET_PREFIX = `http://${API_HOST}:${API_PORT}/api`;

function copyAllowedHeaders(src: Headers) {
  const headers = new Headers();
  src.forEach((v, k) => {
    // skip hop-by-hop headers if present
    if (/^(connection|keep-alive|proxy-authenticate|proxy-authorization|te|trailers|transfer-encoding|upgrade)$/i.test(k)) return;
    headers.set(k, v);
  });
  return headers;
}

async function forward(request: Request, pathParts?: string[]) {
  const path = pathParts && pathParts.length ? pathParts.join("/") : "";
  const targetUrl = TARGET_PREFIX + (path ? `/${path}` : "") + (new URL(request.url)).search;
  const init: RequestInit = {
    method: request.method,
    headers: copyAllowedHeaders(request.headers),
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const res = await fetch(targetUrl, init);
  // build response headers (preserve content-type)
  const resHeaders = new Headers();
  res.headers.forEach((v, k) => {
    if (/^(content-length|transfer-encoding|connection)$/i.test(k)) return;
    resHeaders.set(k, v);
  });

  const buf = await res.arrayBuffer();
  return new Response(buf, { status: res.status, headers: resHeaders });
}

async function resolvePathFromContext(context: any) {
  // context itself may be a Promise (App Router). Await it.
  const ctx = await context;
  let params = ctx?.params ?? context?.params;
  // params may also be a Promise
  if (params && typeof params.then === "function") params = await params;
  return params?.path;
}

export async function GET(req: NextRequest, context: any) {
  const path = await resolvePathFromContext(context);
  return forward(req, path);
}
export async function POST(req: NextRequest, context: any) {
  const path = await resolvePathFromContext(context);
  return forward(req, path);
}
export async function PUT(req: NextRequest, context: any) {
  const path = await resolvePathFromContext(context);
  return forward(req, path);
}
export async function PATCH(req: NextRequest, context: any) {
  const path = await resolvePathFromContext(context);
  return forward(req, path);
}
export async function DELETE(req: NextRequest, context: any) {
  const path = await resolvePathFromContext(context);
  return forward(req, path);
}
export async function OPTIONS(req: NextRequest, context: any) {
  const path = await resolvePathFromContext(context);
  return forward(req, path);
}