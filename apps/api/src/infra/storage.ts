import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Env } from '../config/env.js';

/** Ważność linku do pobrania eksportu (FR-705): 15 minut. */
export const DOWNLOAD_URL_TTL_S = 15 * 60;

/**
 * Magazyn eksportów (IMP-171): S3 w chmurze, MinIO lokalnie i w testach. Obiekty z tagiem
 * `expires=7d` – reguła cyklu życia bucketu usuwa je po 7 dniach (IMP-012).
 */
export class ExportStorage {
  readonly client: S3Client;
  readonly bucket: string;

  constructor(private readonly env: Env) {
    this.bucket = env.S3_BUCKET;
    this.client = new S3Client({
      region: env.S3_REGION,
      ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT, forcePathStyle: true } : {}),
      ...(env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
        ? {
            credentials: {
              accessKeyId: env.S3_ACCESS_KEY_ID,
              secretAccessKey: env.S3_SECRET_ACCESS_KEY,
            },
          }
        : {}),
    });
  }

  async put(key: string, body: Uint8Array, contentType: string, metadata: Record<string, string> = {}) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: metadata,
        Tagging: 'expires=7d',
        ...(this.env.S3_KMS_KEY_ID
          ? { ServerSideEncryption: 'aws:kms', SSEKMSKeyId: this.env.S3_KMS_KEY_ID }
          : {}),
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (err) {
      if ((err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404)
        return false;
      throw err;
    }
  }

  /** Link podpisany na 15 min z nazwą pliku w `Content-Disposition`. */
  signedUrl(key: string, filename: string): Promise<string> {
    const ascii = filename
      .normalize('NFD')
      .replace(/[^\x20-\x7e]/g, '')
      .replace(/"/g, '');
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      }),
      { expiresIn: DOWNLOAD_URL_TTL_S },
    );
  }

  close(): void {
    this.client.destroy();
  }
}
