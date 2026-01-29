import {
  AUDIO_EXTENSIONS,
  type GalleryItem,
  type GalleryResponse,
  IMAGE_EXTENSIONS,
  MIME_TYPES,
  VIDEO_EXTENSIONS,
} from '@/lib/gallery/types';
import { NextResponse } from 'next/server';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), '../../data/workflows');

function getFileType(ext: string): 'image' | 'video' | 'audio' | null {
  if ((IMAGE_EXTENSIONS as readonly string[]).includes(ext)) return 'image';
  if ((VIDEO_EXTENSIONS as readonly string[]).includes(ext)) return 'video';
  if ((AUDIO_EXTENSIONS as readonly string[]).includes(ext)) return 'audio';
  return null;
}

async function getFilesFromWorkflowOutput(workflowId: string): Promise<GalleryItem[]> {
  const items: GalleryItem[] = [];
  const outputDir = path.join(DATA_DIR, workflowId, 'output');

  try {
    const files = await readdir(outputDir);

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      const type = getFileType(ext);
      if (!type) continue;

      const filePath = path.join(outputDir, file);
      const fileStat = await stat(filePath);

      if (!fileStat.isFile()) continue;

      const relativePath = `${workflowId}/output/${file}`;
      items.push({
        id: Buffer.from(relativePath).toString('base64url'),
        mimeType: MIME_TYPES[ext] || 'application/octet-stream',
        modifiedAt: fileStat.mtime.toISOString(),
        name: file,
        path: relativePath,
        size: fileStat.size,
        type,
      });
    }
  } catch {
    // Output directory doesn't exist or is not readable
  }

  return items;
}

export async function GET(): Promise<NextResponse<GalleryResponse>> {
  let workflowIds: string[] = [];

  try {
    workflowIds = await readdir(DATA_DIR);
  } catch {
    // Data directory doesn't exist
    return NextResponse.json({ items: [], total: 0 });
  }

  const allItems = await Promise.all(workflowIds.map((id) => getFilesFromWorkflowOutput(id)));

  const items = allItems
    .flat()
    .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

  return NextResponse.json({
    items,
    total: items.length,
  });
}
