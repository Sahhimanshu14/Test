import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: { file: string } }
) {
  const { file } = params;

  // Root directory of the monorepo
  const rootDir = process.cwd();
  // Web app directory
  const publicDownloadsDir = path.join(rootDir, 'apps', 'web', 'public', 'downloads', 'pyq');
  const fallbackDownloadsDir = path.join(rootDir, 'public', 'downloads', 'pyq');

  const fileMap: Record<string, { path: string; filename: string }> = {
    // Chapterwise Question PDFs
    'english': {
      path: fs.existsSync(path.join(publicDownloadsDir, 'CDS_English_Chapterwise_PYQ.pdf'))
        ? path.join(publicDownloadsDir, 'CDS_English_Chapterwise_PYQ.pdf')
        : path.join(fallbackDownloadsDir, 'CDS_English_Chapterwise_PYQ.pdf'),
      filename: 'CDS_English_Chapterwise_PYQ.pdf',
    },
    'gs': {
      path: fs.existsSync(path.join(publicDownloadsDir, 'CDS_GS_Chapterwise_PYQ.pdf'))
        ? path.join(publicDownloadsDir, 'CDS_GS_Chapterwise_PYQ.pdf')
        : path.join(fallbackDownloadsDir, 'CDS_GS_Chapterwise_PYQ.pdf'),
      filename: 'CDS_GS_Chapterwise_PYQ.pdf',
    },
    'math': {
      path: fs.existsSync(path.join(publicDownloadsDir, 'CDS_Math_Chapterwise_PYQ.pdf'))
        ? path.join(publicDownloadsDir, 'CDS_Math_Chapterwise_PYQ.pdf')
        : path.join(fallbackDownloadsDir, 'CDS_Math_Chapterwise_PYQ.pdf'),
      filename: 'CDS_Math_Chapterwise_PYQ.pdf',
    },
    // Chapterwise Answer Key PDFs
    'english-key': {
      path: fs.existsSync(path.join(publicDownloadsDir, 'CDS_English_Chapterwise_Answer_Key.pdf'))
        ? path.join(publicDownloadsDir, 'CDS_English_Chapterwise_Answer_Key.pdf')
        : path.join(fallbackDownloadsDir, 'CDS_English_Chapterwise_Answer_Key.pdf'),
      filename: 'CDS_English_Chapterwise_Answer_Key.pdf',
    },
    'gs-key': {
      path: fs.existsSync(path.join(publicDownloadsDir, 'CDS_GS_Chapterwise_Answer_Key.pdf'))
        ? path.join(publicDownloadsDir, 'CDS_GS_Chapterwise_Answer_Key.pdf')
        : path.join(fallbackDownloadsDir, 'CDS_GS_Chapterwise_Answer_Key.pdf'),
      filename: 'CDS_GS_Chapterwise_Answer_Key.pdf',
    },
    'math-key': {
      path: fs.existsSync(path.join(publicDownloadsDir, 'CDS_Math_Chapterwise_Answer_Key.pdf'))
        ? path.join(publicDownloadsDir, 'CDS_Math_Chapterwise_Answer_Key.pdf')
        : path.join(fallbackDownloadsDir, 'CDS_Math_Chapterwise_Answer_Key.pdf'),
      filename: 'CDS_Math_Chapterwise_Answer_Key.pdf',
    },
    // Raw Official Scanned Booklets
    'raw-english': {
      path: path.join(rootDir, 'English PYQ.pdf'),
      filename: 'UPSC_CDS_English_Official_Archive_Raw.pdf',
    },
    'raw-gs': {
      path: path.join(rootDir, 'GS PYQ.pdf'),
      filename: 'UPSC_CDS_GS_Official_Archive_Raw.pdf',
    },
    'raw-math': {
      path: path.join(rootDir, 'Math PYQ.pdf'),
      filename: 'UPSC_CDS_Math_Official_Archive_Raw.pdf',
    },
  };

  const fileConfig = fileMap[file.toLowerCase()];
  if (!fileConfig || !fs.existsSync(fileConfig.path)) {
    return NextResponse.json(
      { error: `Requested PYQ document "${file}" not found.` },
      { status: 404 }
    );
  }

  const stat = fs.statSync(fileConfig.path);
  const fileStream = fs.createReadStream(fileConfig.path);

  // Convert node stream to web ReadableStream
  const stream = new ReadableStream({
    start(controller) {
      fileStream.on('data', (chunk) => controller.enqueue(chunk));
      fileStream.on('end', () => controller.close());
      fileStream.on('error', (err) => controller.error(err));
    },
  });

  return new NextResponse(stream as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileConfig.filename}"`,
      'Content-Length': stat.size.toString(),
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
