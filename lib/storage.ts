import { createAdminClient } from "@/lib/supabase/admin";

export async function uploadScreenImage(
  agentId: string,
  boardId: string,
  screenId: string,
  file: Buffer,
  contentType: string
): Promise<string> {
  const supabase = createAdminClient();
  const EXT_MAP: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };
  const ext = EXT_MAP[contentType] || "png";
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

  return publicUrl;
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
  const paths = [
    `${agentId}/${boardId}/${screenId}.png`,
    `${agentId}/${boardId}/${screenId}.jpg`,
    `${agentId}/${boardId}/${screenId}.webp`,
    `${agentId}/${boardId}/${screenId}.html`,
  ];

  await supabase.storage.from("screens").remove(paths);
}
