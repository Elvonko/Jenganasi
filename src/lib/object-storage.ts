import "server-only";

export type StoredObject = {
  key: string;
  contentType: string;
  size: number;
};

export interface ObjectStorage {
  put(key: string, data: Uint8Array, contentType: string): Promise<StoredObject>;
  delete(key: string): Promise<void>;
  signedGetUrl(key: string, contentType: string, expiresInSeconds?: number): Promise<string>;
}

export function isObjectStorageConfigured(): boolean {
  return Boolean(
    process.env.OBJECT_STORAGE_BUCKET &&
      process.env.OBJECT_STORAGE_ACCESS_KEY_ID &&
      process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY,
  );
}

export async function getObjectStorage(): Promise<ObjectStorage> {
  if (isObjectStorageConfigured()) {
    const { S3ObjectStorage } = await import("./object-storage-s3");
    return new S3ObjectStorage();
  }
  const { InMemoryObjectStorage } = await import("./object-storage-memory");
  return InMemoryObjectStorage;
}
