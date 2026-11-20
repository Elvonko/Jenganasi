import type { ObjectStorage, StoredObject } from "./object-storage";

const objects = new Map<string, { data: Uint8Array; contentType: string }>();

export const InMemoryObjectStorage: ObjectStorage = {
  async put(key, data, contentType): Promise<StoredObject> {
    objects.set(key, { data: new Uint8Array(data), contentType });
    return { key, contentType, size: data.byteLength };
  },
  async delete(key): Promise<void> {
    objects.delete(key);
  },
  async signedGetUrl(key): Promise<string> {
    throw new Error(`Object ${key} is not available via a signed URL.`);
  },
};

export function readInMemoryObject(key: string) {
  const object = objects.get(key);
  return object ? { data: new Uint8Array(object.data), contentType: object.contentType } : null;
}
