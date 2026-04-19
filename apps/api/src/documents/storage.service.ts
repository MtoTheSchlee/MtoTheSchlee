import { Injectable, Logger } from '@nestjs/common';
import { Client as MinioClient } from 'minio';
import { createHash } from 'node:crypto';

@Injectable()
export class StorageService {
  private readonly log = new Logger('StorageService');
  private client: MinioClient;

  constructor() {
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
    await this.ensureBucket(bucket);
    const checksum = createHash('sha256').update(body).digest('hex');
    await this.client.putObject(bucket, key, body, body.length, {
      'Content-Type': mime,
      'x-amz-meta-sha256': checksum,
    });
    return { storageKey: `${bucket}/${key}`, checksum };
  }

  async presignGet(bucket: string, key: string, expires = 600): Promise<string> {
    return this.client.presignedGetObject(bucket, key, expires);
  }

  private async ensureBucket(bucket: string) {
    const exists = await this.client.bucketExists(bucket).catch(() => false);
    if (!exists) {
      await this.client.makeBucket(bucket, process.env.S3_REGION ?? 'us-east-1');
      this.log.log(`created bucket ${bucket}`);
    }
  }
}
