import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE || 
  (process.env.NEXT_PUBLIC_API_IP && process.env.NEXT_PUBLIC_API_PORT
    ? `http://${process.env.NEXT_PUBLIC_API_IP}:${process.env.NEXT_PUBLIC_API_PORT}`
    : 'http://localhost:8000');

export async function GET(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  try {
    // Await params first
    const resolvedParams = await params;
    
    // Get the path segments (e.g., ["divisions"], ["groups"], etc.)
    const pathSegments = resolvedParams.path || [];
    const path = pathSegments.join('/');
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    
    // Construct backend URL (note: backend routes are under /api prefix)
    const backendPath = path ? `/api/${path}` : '/api';
    const backendQuery = queryString ? `?${queryString}` : '';
    const url = `${BACKEND_URL}${backendPath}${backendQuery}`;
    
    console.log('[Proxy] GET', url);
    
    // Forward request to backend
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Proxy] Backend error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Backend request failed', details: errorText },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Proxy error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  try {
    const pathSegments = await params.path || [];
    const path = pathSegments.join('/');
    
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    
    const body = await request.json();
    
    // Construct backend URL (note: backend routes are under /api prefix)
    const backendPath = path ? `/api/${path}` : '/api';
    const backendQuery = queryString ? `?${queryString}` : '';
    const url = `${BACKEND_URL}${backendPath}${backendQuery}`;
    
    console.log('[Proxy] POST', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Proxy] Backend error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Backend request failed', details: errorText },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Proxy error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
