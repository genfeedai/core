import { type NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

interface SplitResult {
  index: number;
  data: string; // base64 encoded image
  width: number;
  height: number;
}

/**
 * Image Grid Split endpoint
 * Splits an image into a grid of cells (e.g., 2x3, 3x3, 6x6)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Get image from form data (either file upload or base64 string)
    const imageInput = formData.get('image');
    const gridRows = Number.parseInt(formData.get('gridRows') as string, 10) || 2;
    const gridCols = Number.parseInt(formData.get('gridCols') as string, 10) || 3;
    const borderInset = Number.parseInt(formData.get('borderInset') as string, 10) || 10;
    const outputFormat = (formData.get('outputFormat') as 'jpg' | 'png' | 'webp') || 'jpg';
    const quality = Number.parseInt(formData.get('quality') as string, 10) || 95;

    // Validate grid dimensions
    if (gridRows < 1 || gridRows > 10 || gridCols < 1 || gridCols > 10) {
      return NextResponse.json(
        { error: 'Grid dimensions must be between 1 and 10' },
        { status: 400 }
      );
    }

    // Get image buffer
    let imageBuffer: Buffer;

    if (imageInput instanceof File) {
      // Handle file upload
      const arrayBuffer = await imageInput.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } else if (typeof imageInput === 'string') {
      // Handle base64 or URL
      if (imageInput.startsWith('data:')) {
        // Base64 data URL
        const base64Data = imageInput.split(',')[1];
        imageBuffer = Buffer.from(base64Data, 'base64');
      } else if (imageInput.startsWith('http')) {
        // URL - fetch the image
        const response = await fetch(imageInput);
        if (!response.ok) {
          return NextResponse.json({ error: 'Failed to fetch image from URL' }, { status: 400 });
        }
        const arrayBuffer = await response.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
      } else {
        return NextResponse.json({ error: 'Invalid image input' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    if (!metadata.width || !metadata.height) {
      return NextResponse.json({ error: 'Unable to read image dimensions' }, { status: 400 });
    }

    // Calculate cell dimensions
    const cellWidth = Math.floor(metadata.width / gridCols);
    const cellHeight = Math.floor(metadata.height / gridRows);

    // Validate border inset
    const maxInset = Math.min(cellWidth / 2, cellHeight / 2) - 1;
    const safeInset = Math.min(borderInset, Math.max(0, maxInset));

    // Split the image into grid cells
    const results: SplitResult[] = [];

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const index = row * gridCols + col;

        // Calculate extraction coordinates with border inset
        const left = col * cellWidth + safeInset;
        const top = row * cellHeight + safeInset;
        const width = cellWidth - safeInset * 2;
        const height = cellHeight - safeInset * 2;

        // Extract the cell
        let pipeline = sharp(imageBuffer).extract({ left, top, width, height });

        // Apply output format
        switch (outputFormat) {
          case 'png':
            pipeline = pipeline.png({ quality });
            break;
          case 'webp':
            pipeline = pipeline.webp({ quality });
            break;
          default:
            pipeline = pipeline.jpeg({ quality });
        }

        const cellBuffer = await pipeline.toBuffer();

        // Convert to base64 data URL
        const mimeTypes: Record<string, string> = {
          png: 'image/png',
          webp: 'image/webp',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
        };
        const mimeType = mimeTypes[outputFormat] ?? 'image/jpeg';
        const base64 = cellBuffer.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64}`;

        results.push({
          index,
          data: dataUrl,
          width,
          height,
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalCells: gridRows * gridCols,
      gridRows,
      gridCols,
      originalDimensions: { width: metadata.width, height: metadata.height },
      cellDimensions: { width: cellWidth - safeInset * 2, height: cellHeight - safeInset * 2 },
      borderInset: safeInset,
      images: results,
    });
  } catch (error) {
    console.error('Grid split error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Grid split failed' },
      { status: 500 }
    );
  }
}
