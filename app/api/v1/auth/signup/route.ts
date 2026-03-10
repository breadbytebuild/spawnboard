import { NextRequest } from "next/server";
import { z } from "zod/v4";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { generateApiKey, generateSlug } from "@/lib/utils";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const allowed = checkRateLimit(ip);
  if (!allowed) {
    return apiError("RATE_LIMITED", "Rate limit exceeded. Try again later.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body");
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error.issues[0].message);
  }

  const { name, email, password } = parsed.data;
  const supabase = createAdminClient();

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.toLowerCase().includes("already")) {
      return apiError("CONFLICT", "An account with this email already exists");
    }
    return apiError("INTERNAL_ERROR", "Failed to create account");
  }

  const supabaseUserId = authData.user.id;

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .insert({ supabase_user_id: supabaseUserId, name, email })
    .select("id, name, email")
    .single();

  if (agentError) {
    await supabase.auth.admin.deleteUser(supabaseUserId);
    return apiError("INTERNAL_ERROR", "Failed to create agent record");
  }

  const rawApiKey = generateApiKey();
  const keyHash = await bcrypt.hash(rawApiKey, 12);
  const keyPrefix = rawApiKey.slice(0, 8);

  const { error: keyError } = await supabase
    .from("api_keys")
    .insert({ agent_id: agent.id, key_hash: keyHash, key_prefix: keyPrefix });

  if (keyError) {
    await supabase.auth.admin.deleteUser(supabaseUserId);
    return apiError("INTERNAL_ERROR", "Failed to create API key");
  }

  const workspaceName = `${name}'s Workspace`;
  const workspaceSlug = generateSlug(name) + "-" + Math.random().toString(36).slice(2, 8);

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({ name: workspaceName, slug: workspaceSlug, agent_id: agent.id })
    .select("id, name, slug")
    .single();

  if (workspaceError) {
    // Full cleanup: CASCADE from auth user deletion removes agent + api_keys
    await supabase.auth.admin.deleteUser(supabaseUserId);
    return apiError("INTERNAL_ERROR", "Failed to create default workspace");
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spawnboard.vercel.app";

  return apiSuccess({
    agent: { id: agent.id, name: agent.name, email: agent.email },
    api_key: rawApiKey,
    workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
    onboarding: {
      message: `Welcome to SpawnBoard, ${name}! Your workspace is ready. Here's everything you need to start uploading screens.`,
      save_your_api_key: "This API key is shown ONCE. Store it securely. All API requests use: Authorization: Bearer <your_key>",
      next_steps: [
        {
          step: 1,
          action: "Create a project",
          method: "POST",
          endpoint: `${baseUrl}/api/v1/workspaces/${workspace.id}/projects`,
          body: { name: "My App", description: "Optional description" },
        },
        {
          step: 2,
          action: "Create a board inside that project",
          method: "POST",
          endpoint: `${baseUrl}/api/v1/projects/{project_id}/boards`,
          body: { name: "Onboarding Flow" },
        },
        {
          step: 3,
          action: "Upload screens to the board",
          method: "POST",
          endpoint: `${baseUrl}/api/v1/boards/{board_id}/screens`,
          content_type: "multipart/form-data",
          fields: {
            image: "PNG/JPG/WebP file (max 10MB)",
            name: "Screen name (required)",
            width: "Width in px (default: 393)",
            height: "Height in px (default: 852)",
          },
          note: "Screens without canvas_x/canvas_y are auto-laid out in a grid. You can also send 'html' instead of 'image' for HTML screens.",
        },
        {
          step: 4,
          action: "Share with your human",
          method: "POST",
          endpoint: `${baseUrl}/api/v1/boards/{board_id}/share`,
          body: { slug: "my-custom-slug" },
          note: "Returns a preview URL like: " + baseUrl + "/preview/my-custom-slug",
        },
      ],
      batch_upload: {
        description: "Upload multiple screens at once with positions",
        method: "POST",
        endpoint: `${baseUrl}/api/v1/boards/{board_id}/screens/batch`,
        example_body: {
          screens: [
            { name: "Welcome", image_url: "https://...", canvas_x: 0, canvas_y: 0 },
            { name: "Step 2", image_url: "https://...", canvas_x: 433, canvas_y: 0 },
          ],
        },
      },
      docs: `${baseUrl}/docs/api-reference`,
      quickstart: `${baseUrl}/docs/quickstart`,
      dashboard: `${baseUrl}/dashboard`,
    },
  });
}
