import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from './storage.service.js';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  list(tenantId: string, filter?: { projectId?: string; kind?: string; toReview?: boolean }) {
    return this.prisma.document.findMany({
      where: {
        tenantId,
        ...(filter?.projectId ? { projectId: filter.projectId } : {}),
        ...(filter?.kind ? { kind: filter.kind as any } : {}),
        ...(typeof filter?.toReview === 'boolean' ? { toReview: filter.toReview } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upload(
    tenantId: string,
    input: {
      title: string;
      kind?: string;
      mime: string;
      body: Buffer;
      projectId?: string;
      customerId?: string;
      supplierId?: string;
      source?: 'upload' | 'email' | 'agent' | 'scan';
      metadata?: any;
      toReview?: boolean;
    },
  ) {
    const bucket = process.env.S3_BUCKET_DOCUMENTS ?? 'kkos-documents';
    const key = `${tenantId}/${Date.now()}-${input.title.replace(/[^\w.\-]+/g, '_')}`;
    const { storageKey, checksum } = await this.storage.put(bucket, key, input.body, input.mime);
    return this.prisma.document.create({
      data: {
        tenantId,
        title: input.title,
        kind: (input.kind ?? 'other') as any,
        mime: input.mime,
        sizeBytes: input.body.length,
        storageKey,
        checksum,
        source: (input.source ?? 'upload') as any,
        projectId: input.projectId,
        customerId: input.customerId,
        supplierId: input.supplierId,
        metadata: input.metadata,
        toReview: input.toReview ?? false,
      },
    });
  }

  async signedUrl(tenantId: string, id: string) {
    const doc = await this.prisma.document.findFirst({ where: { id, tenantId } });
    if (!doc) return null;
    const [bucket, ...rest] = doc.storageKey.split('/');
    const key = rest.join('/');
    if (!bucket) return null;
    return { url: await this.storage.presignGet(bucket, key) };
  }
}
