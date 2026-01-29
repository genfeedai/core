import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { type NextRequest, NextResponse } from 'next/server';
import { unlink } from 'node:fs/promises';
import { MIME_TYPES } from '@/lib/gallery/types';

const DATA_DIR = path.resolve(process.cwd(), '../../data/workflows');

/**
 * Parse HTTP Range header for partial content requests
 * Returns start/end byte positions or null if invalid
 */
function parseRangeHeader(
  rangeHeader: string | null,
  fileSize: number
): { start: number; end: number } | null {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=')) {
    return null;
  }

  const range = rangeHeader.slice(6); // Remove "bytes="
  const [startStr, endStr] = range.split('-');

  let start = parseInt(startStr, 10);
  let end = endStr ? parseInt(endStr, 10) : fileSize - 1;

  // Handle suffix range (e.g., "bytes=-500" = last 500 bytes)
  if (Number.isNaN(start)) {
    start = Math.max(0, fileSize - (parseInt(endStr, 10) || 0));
    end = fileSize - 1;
  }

  // Validate range
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= fileSize) {
    return null;
  }

  // Clamp end to file size
  end = Math.min(end, fileSize - 1);

  return { start, end };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse | Response> {
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
    const fileSize = fileStat.size;

    // Check for Range header (partial content request)
    const rangeHeader = request.headers.get('range');
    const range = parseRangeHeader(rangeHeader, fileSize);

    // Common headers
    const baseHeaders: Record<string, string> = {
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
    };

    if (range) {
      // Partial content (206) - used for video seeking
      const { start, end } = range;
      const contentLength = end - start + 1;

      const stream = createReadStream(filePath, { start, end });
      const readableStream = nodeStreamToWeb(stream);

      return new Response(readableStream, {
        status: 206,
        headers: {
          ...baseHeaders,
          'Content-Length': contentLength.toString(),
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        },
      });
    }

    // Full file streaming (200)
    const stream = createReadStream(filePath);
    const readableStream = nodeStreamToWeb(stream);

    return new Response(readableStream, {
      status: 200,
      headers: {
        ...baseHeaders,
        'Content-Length': fileSize.toString(),
      },
    });
  } catch {
    return new NextResponse('Not Found', { status: 404 });
  }
}

/**
 * Convert Node.js readable stream to Web ReadableStream
 */
function nodeStreamToWeb(
  nodeStream: ReturnType<typeof createReadStream>
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });
      nodeStream.on('end', () => {
        controller.close();
      });
      nodeStream.on('error', (err) => {
        controller.error(err);
      });
    },
    cancel() {
      nodeStream.destroy();
    },
  });
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
