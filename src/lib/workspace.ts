import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";

export async function getCurrentUserWorkspace() {
  const supabase = await createSupabaseServerAuthClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .order("role", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (!membership) {
    throw new Error("No workspace membership found for this user.");
  }

  return {
    user,
    workspaceId: membership.workspace_id as string,
    role: membership.role as "owner" | "member",
  };
}
