import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ObjectStorage, StoredObject } from "./object-storage";

export class S3ObjectStorage implements ObjectStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const bucket = process.env.OBJECT_STORAGE_BUCKET;
    if (!bucket) throw new Error("OBJECT_STORAGE_BUCKET is required.");
    this.bucket = bucket;
    this.client = new S3Client({
      region: process.env.OBJECT_STORAGE_REGION ?? "auto",
      endpoint: process.env.OBJECT_STORAGE_ENDPOINT,
      forcePathStyle: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY_ID!,
        secretAccessKey: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY!,
      },
    });
  }

  async put(key: string, data: Uint8Array, contentType: string): Promise<StoredObject> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );
    return { key, contentType, size: data.byteLength };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async signedGetUrl(
    key: string,
    contentType: string,
    expiresInSeconds = 300,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}
