import { createAdminClient } from "@/lib/supabase/admin";
import sizeOf from "image-size";

const EXT_MAP: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/gif": "gif",
  "image/avif": "avif",
  "application/octet-stream": "riv",
  "application/x-rive": "riv",
};

export const ALLOWED_IMAGE_TYPES = Object.keys(EXT_MAP);

export function isRiveFile(filename: string, contentType: string): boolean {
  return (
    filename.endsWith(".riv") ||
    contentType === "application/x-rive"
  );
}

export function getExtFromContentType(contentType: string): string {
  return EXT_MAP[contentType] || "png";
}

export function extractDimensions(
  buffer: Buffer,
  contentType: string
): { width: number; height: number } | null {
  try {
    if (contentType === "image/svg+xml") {
      const svg = buffer.toString("utf-8");
      const viewBoxMatch = svg.match(/viewBox=["']([^"']+)["']/);
      if (viewBoxMatch) {
        const parts = viewBoxMatch[1].split(/[\s,]+/).map(Number);
        if (parts.length >= 4) {
          return { width: Math.round(parts[2]), height: Math.round(parts[3]) };
        }
      }
      const widthMatch = svg.match(/\bwidth=["'](\d+)/);
      const heightMatch = svg.match(/\bheight=["'](\d+)/);
      if (widthMatch && heightMatch) {
        return { width: parseInt(widthMatch[1]), height: parseInt(heightMatch[1]) };
      }
      return null;
    }

    const result = sizeOf(buffer);
    if (result.width && result.height) {
      return { width: result.width, height: result.height };
    }
    return null;
  } catch {
    return null;
  }
}

export async function uploadScreenImage(
  agentId: string,
  boardId: string,
  screenId: string,
  file: Buffer,
  contentType: string
): Promise<{ url: string; thumbnailUrl: string; fileSize: number }> {
  const supabase = createAdminClient();
  const ext = getExtFromContentType(contentType);
  const path = `${agentId}/${boardId}/${screenId}.${ext}`;

  const { error } = await supabase.storage
    .from("screens")
    .upload(path, file, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("screens").getPublicUrl(path);

  // Thumbnail via Supabase Storage transforms (width=400)
  const thumbnailUrl =
    contentType === "image/svg+xml"
      ? publicUrl // SVGs don't need thumbnails — they're vector
      : `${publicUrl}?width=400`;

  return { url: publicUrl, thumbnailUrl, fileSize: file.length };
}

export async function uploadHtmlFile(
  agentId: string,
  boardId: string,
  screenId: string,
  html: string
): Promise<string> {
  const supabase = createAdminClient();
  const path = `${agentId}/${boardId}/${screenId}.html`;

  const { error } = await supabase.storage
    .from("screens")
    .upload(path, Buffer.from(html, "utf-8"), {
      contentType: "text/html",
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("screens").getPublicUrl(path);

  return publicUrl;
}

export async function deleteScreenFiles(
  agentId: string,
  boardId: string,
  screenId: string
): Promise<void> {
  const supabase = createAdminClient();
  const exts = ["png", "jpg", "webp", "svg", "gif", "avif", "html", "riv"];
  const paths = exts.map(
    (ext) => `${agentId}/${boardId}/${screenId}.${ext}`
  );

  await supabase.storage.from("screens").remove(paths);
}
