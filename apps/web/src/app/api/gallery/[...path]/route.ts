import { readFile, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { type NextRequest, NextResponse } from 'next/server';
import { MIME_TYPES } from '@/lib/gallery/types';

const DATA_DIR = path.resolve(process.cwd(), '../../data/workflows');

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path: pathSegments } = await params;
  const requestedPath = pathSegments.join('/');

  // Validate path to prevent directory traversal
  const filePath = path.resolve(DATA_DIR, requestedPath);
  if (!filePath.startsWith(DATA_DIR)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    const fileBuffer = await readFile(filePath);

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileStat.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Not Found', { status: 404 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path: pathSegments } = await params;
  const requestedPath = pathSegments.join('/');

  // Validate path to prevent directory traversal
  const filePath = path.resolve(DATA_DIR, requestedPath);
  if (!filePath.startsWith(DATA_DIR)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return new NextResponse('Not Found', { status: 404 });
    }

    await unlink(filePath);

    return NextResponse.json({ success: true });
  } catch {
    return new NextResponse('Not Found', { status: 404 });
  }
}
