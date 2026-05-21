import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "@wellfit-emr/env/server";

export const ALLOWED_PATIENT_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export const MAX_PATIENT_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

function createS3Client(): S3Client {
  return new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });
}

let sharedS3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!sharedS3Client) {
    sharedS3Client = createS3Client();
  }
  return sharedS3Client;
}

export interface StorageService {
  delete(key: string): Promise<void>;
  get(key: string): Promise<Uint8Array>;
  head(
    key: string
  ): Promise<{ size: number; mimeType: string; lastModified?: Date }>;
  upload(
    key: string,
    body: Uint8Array | Buffer | string,
    mimeType: string
  ): Promise<void>;
}

export class S3StorageService implements StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(client = getS3Client(), bucket = env.S3_BUCKET) {
    this.client = client;
    this.bucket = bucket;
  }

  async upload(
    key: string,
    body: Uint8Array | Buffer | string,
    mimeType: string
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: mimeType,
    });
    await this.client.send(command);
  }

  async get(key: string): Promise<Uint8Array> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error(`Object not found: ${key}`);
    }
    const chunks: Uint8Array[] = [];
    // biome-ignore lint/suspicious/noExplicitAny: AWS SDK body typing
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  async head(
    key: string
  ): Promise<{ size: number; mimeType: string; lastModified?: Date }> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const response = await this.client.send(command);
    return {
      size: response.ContentLength ?? 0,
      mimeType: response.ContentType ?? "application/octet-stream",
      lastModified: response.LastModified,
    };
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.client.send(command);
  }
}

export function createStorageService(): StorageService {
  return new S3StorageService();
}

export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_PATIENT_DOCUMENT_MIME_TYPES.includes(mimeType);
}

export function isAllowedSize(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= MAX_PATIENT_DOCUMENT_SIZE_BYTES;
}
