import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generatePresignedUploadUrl } from '@/lib/s3';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const body = await req.json();
    const { fileName, contentType, isPublic = true } = body;

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: 'fileName und contentType sind erforderlich' },
        { status: 400 }
      );
    }

    // Validate content type for images
    if (!contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Nur Bilddateien sind erlaubt' },
        { status: 400 }
      );
    }

    const { uploadUrl, cloud_storage_path, publicUrl } = await generatePresignedUploadUrl(
      fileName,
      contentType,
      isPublic
    );

    return NextResponse.json({ uploadUrl, cloud_storage_path, publicUrl }, { status: 200 });
  } catch (error) {
    console.error('Presigned URL error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Upload-URL' },
      { status: 500 }
    );
  }
}
