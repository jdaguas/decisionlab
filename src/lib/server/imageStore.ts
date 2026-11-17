import "server-only";
import { randomBytes } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Option photos shared for peer review. Stored in Postgres (base64) behind the
 * same server-only access as polls, so no public storage bucket is needed.
 * Falls back to memory when Supabase isn't configured.
 */

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];
/** Decoded size limit. Photos are shrunk in the browser first, so this is generous. */
export const MAX_IMAGE_BYTES = 600 * 1024;

type Img = { type: ImageType; data: string /* base64 */ };

interface ImageStore {
  put(img: Img): Promise<string>;
  get(id: string): Promise<Img | null>;
}

const newId = () => randomBytes(18).toString("base64url"); // 144-bit, unguessable

class MemoryImages implements ImageStore {
  m = new Map<string, Img>();
  async put(img: Img) {
    const id = newId();
    this.m.set(id, img);
    return id;
  }
  async get(id: string) {
    return this.m.get(id) ?? null;
  }
}

class SupabaseImages implements ImageStore {
  constructor(private db: SupabaseClient) {}
  async put(img: Img) {
    const id = newId();
    const { error } = await this.db.from("images").insert({ id, content_type: img.type, data: img.data });
    if (error) throw error;
    return id;
  }
  async get(id: string) {
    const { data, error } = await this.db.from("images").select("content_type, data").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? { type: data.content_type as ImageType, data: data.data as string } : null;
  }
}

const IMAGE_STORE_VERSION = 1;
const g = globalThis as unknown as { __imageStore?: ImageStore; __imageStoreVersion?: number };

export function imageStore(): ImageStore {
  if (g.__imageStore && g.__imageStoreVersion === IMAGE_STORE_VERSION) return g.__imageStore;
  g.__imageStoreVersion = IMAGE_STORE_VERSION;
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  g.__imageStore = url && key
    ? new SupabaseImages(createClient(url, key, { auth: { persistSession: false } }))
    : new MemoryImages();
  return g.__imageStore;
}

/** Checks the real file signature, not just the claimed type. */
export function sniff(bytes: Buffer): ImageType | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.length > 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}
