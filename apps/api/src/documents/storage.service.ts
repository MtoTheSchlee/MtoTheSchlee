import { Injectable, Logger } from '@nestjs/common';
import { Client as MinioClient } from 'minio';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * Pluggable object storage.
 *
 * Default is S3/MinIO so production and the docker-compose stack work
 * out of the box. If `STORAGE_BACKEND=fs` (or MinIO isn't reachable on
 * the first call), we fall back to a local directory. That keeps the
 * upload flow usable in environments without Docker - handy for the
 * demo sandbox and CI.
 */
@Injectable()
export class StorageService {
  private readonly log = new Logger('StorageService');
  private readonly backend: 's3' | 'fs' =
    (process.env.STORAGE_BACKEND as 's3' | 'fs') ?? 's3';
  private readonly fsRoot = resolve(
    process.env.STORAGE_FS_ROOT ?? '/tmp/kkos-storage',
  );
  private readonly client: MinioClient | null;

  constructor() {
    if (this.backend === 'fs') {
      this.client = null;
      this.log.log(`storage backend=fs root=${this.fsRoot}`);
      return;
    }
    const endpoint = new URL(process.env.S3_ENDPOINT ?? 'http://localhost:9000');
    this.client = new MinioClient({
      endPoint: endpoint.hostname,
      port: Number(endpoint.port || (endpoint.protocol === 'https:' ? 443 : 80)),
      useSSL: endpoint.protocol === 'https:',
      accessKey: process.env.S3_ACCESS_KEY ?? 'minio',
      secretKey: process.env.S3_SECRET_KEY ?? 'minio12345',
      pathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
    });
  }

  /** Upload a buffer, return storage key + checksum. */
  async put(
    bucket: string,
    key: string,
    body: Buffer,
    mime: string,
  ): Promise<{ storageKey: string; checksum: string }> {
    const checksum = createHash('sha256').update(body).digest('hex');
    if (this.backend === 'fs' || !this.client) {
      return this.putFs(bucket, key, body, checksum);
    }
    try {
      await this.ensureBucket(bucket);
      await this.client.putObject(bucket, key, body, body.length, {
        'Content-Type': mime,
        'x-amz-meta-sha256': checksum,
      });
      return { storageKey: `${bucket}/${key}`, checksum };
    } catch (err) {
      this.log.warn({ err: String(err) }, 's3 put failed – falling back to fs');
      return this.putFs(bucket, key, body, checksum);
    }
  }

  async presignGet(bucket: string, key: string, expires = 600): Promise<string> {
    if (this.backend === 'fs' || !this.client) {
      return `file://${join(this.fsRoot, bucket, key)}`;
    }
    try {
      return await this.client.presignedGetObject(bucket, key, expires);
    } catch (err) {
      this.log.warn({ err: String(err) }, 's3 presign failed');
      return `file://${join(this.fsRoot, bucket, key)}`;
    }
  }

  /** Read-back helper, currently only used by local diagnostics + tests. */
  async read(bucket: string, key: string): Promise<Buffer | null> {
    if (this.backend === 'fs' || !this.client) {
      const path = join(this.fsRoot, bucket, key);
      return existsSync(path) ? readFile(path) : null;
    }
    try {
      const stream = await this.client.getObject(bucket, key);
      return await new Promise<Buffer>((resolveP, rejectP) => {
        const chunks: Buffer[] = [];
        stream.on('data', (c) => chunks.push(Buffer.from(c)));
        stream.on('end', () => resolveP(Buffer.concat(chunks)));
        stream.on('error', rejectP);
      });
    } catch (err) {
      this.log.warn({ err: String(err) }, 's3 get failed');
      return null;
    }
  }

  private async putFs(
    bucket: string,
    key: string,
    body: Buffer,
    checksum: string,
  ): Promise<{ storageKey: string; checksum: string }> {
    const path = join(this.fsRoot, bucket, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
    return { storageKey: `${bucket}/${key}`, checksum };
  }

  private async ensureBucket(bucket: string) {
    const exists = await this.client!.bucketExists(bucket).catch(() => false);
    if (!exists) {
      await this.client!.makeBucket(bucket, process.env.S3_REGION ?? 'us-east-1');
      this.log.log(`created bucket ${bucket}`);
    }
  }
}
