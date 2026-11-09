import { env } from '@/lib/env';
import { ApiClientError } from '@/services/api/apiError';

/**
 * Authenticated binary download (learning materials). Never uses a public URL.
 */
export async function downloadAuthorizedFile(path: string, accessToken: string | null) {
  if (!accessToken) {
    throw new ApiClientError({
      message: 'Authentication required.',
      code: 'UNAUTHORIZED',
      status: 401,
    });
  }

  const url = `${env.apiBaseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: '*/*',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    let message = 'Unable to download file.';
    try {
      const body = (await response.json()) as { message?: string; code?: string };
      if (body.message) message = body.message;
      throw new ApiClientError({
        message,
        code: body.code ?? 'DOWNLOAD_FAILED',
        status: response.status,
      });
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
      throw new ApiClientError({
        message,
        code: 'DOWNLOAD_FAILED',
        status: response.status,
      });
    }
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const match = /filename="([^"]+)"/i.exec(disposition);
  const fileName = match?.[1] ?? 'download';

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
