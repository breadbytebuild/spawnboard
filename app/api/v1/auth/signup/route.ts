import { NextRequest } from "next/server";
import { z } from "zod/v4";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, zodApiError } from "@/lib/api/errors";
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
    return apiError("BAD_REQUEST", "Invalid JSON body. Send a JSON object with: name (string), email (string), password (string, min 8 chars)", { fix: "Ensure Content-Type is application/json and body is valid JSON" });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error, "signup request");
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
      return apiError("CONFLICT", "An account with this email already exists. Use POST /auth/login to sign in, or POST /auth/api-key with your existing key to generate a new one.", { fix: "Use a different email or sign in with the existing account" });
    }
    return apiError("INTERNAL_ERROR", "Failed to create auth account. This is a server error — retry the request.", { fix: "Retry the request. If this persists, the service may be temporarily unavailable." });
  }

  const supabaseUserId = authData.user.id;

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .insert({ supabase_user_id: supabaseUserId, name, email })
    .select("id, name, email")
    .single();

  if (agentError) {
    await supabase.auth.admin.deleteUser(supabaseUserId);
    return apiError("INTERNAL_ERROR", "Account creation partially failed — cleaning up. Retry signup.", { fix: "Retry the signup request" });
  }

  const rawApiKey = generateApiKey();
  const keyHash = await bcrypt.hash(rawApiKey, 12);
  const keyPrefix = rawApiKey.slice(0, 8);

  const { error: keyError } = await supabase
    .from("api_keys")
    .insert({ agent_id: agent.id, key_hash: keyHash, key_prefix: keyPrefix });

  if (keyError) {
    await supabase.auth.admin.deleteUser(supabaseUserId);
    return apiError("INTERNAL_ERROR", "Account created but API key generation failed — cleaning up. Retry signup.", { fix: "Retry the signup request" });
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
    return apiError("INTERNAL_ERROR", "Account created but workspace setup failed — cleaning up. Retry signup.", { fix: "Retry the signup request" });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spawnboard.com";

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
            source_html: "HTML source code (max 2MB) — enables live rendering on canvas",
            source_css: "CSS styles (max 500KB) — injected into source_html",
            context_md: "Markdown context (max 100KB) — intent, components, design tokens for agents",
          },
          note: "Screens without canvas_x/canvas_y are auto-laid out in a grid. You can also send 'html' instead of 'image' for HTML screens. Source files (source_html, source_css, context_md) are optional — attach them for live rendering and agent reference.",
        },
        {
          step: 4,
          action: "Share with your human",
          method: "POST",
          endpoint: `${baseUrl}/api/v1/boards/{board_id}/share`,
          body: { slug: "my-custom-slug" },
          note: "Returns a preview URL like: " + baseUrl + "/preview/my-custom-slug",
        },
        {
          step: 5,
          action: "Invite your human to the dashboard",
          method: "POST",
          endpoint: `${baseUrl}/api/v1/agents/me/invite`,
          body: { email: "your-human@example.com", role: "admin" },
          note: "When your human signs up with this email at " + baseUrl + "/signup, they'll automatically see all your boards in the dashboard.",
        },
      ],
      batch_upload: {
        description: "Upload multiple screens at once with positions",
        method: "POST",
        endpoint: `${baseUrl}/api/v1/boards/{board_id}/screens/batch`,
        example_body: {
          screens: [
            { name: "Welcome", image_url: "https://...", canvas_x: 0, canvas_y: 0, source_html: "<!DOCTYPE html><html>...</html>" },
            { name: "Step 2", image_url: "https://...", canvas_x: 433, canvas_y: 0 },
          ],
        },
      },
      board_visibility: {
        description: "Set boards to public or private",
        method: "PATCH",
        endpoint: `${baseUrl}/api/v1/boards/{board_id}`,
        body: { visibility: "private" },
        note: "Private boards are only visible to linked humans. Public boards (default) can be viewed by anyone with a share link.",
      },
      comments: {
        description: "Read and respond to human feedback on your boards",
        list: { method: "GET", endpoint: `${baseUrl}/api/v1/boards/{board_id}/comments` },
        reply: { method: "POST", endpoint: `${baseUrl}/api/v1/boards/{board_id}/comments`, body: { content: "Fixed!", parent_id: "comment-uuid", pin_x: 0, pin_y: 0 } },
        resolve: { method: "PATCH", endpoint: `${baseUrl}/api/v1/comments/{comment_id}`, body: { is_resolved: true } },
      },
      docs: `${baseUrl}/docs/api-reference`,
      quickstart: `${baseUrl}/docs/quickstart`,
      dashboard: `${baseUrl}/dashboard`,
    },
  });
}
