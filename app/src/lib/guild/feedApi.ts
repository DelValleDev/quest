import { supabase } from "../supabase";

export interface GuildPost {
  id: string;
  guild_id: string;
  author_id: string;
  post_type: "text" | "image" | "video" | "achievement" | "poll";
  content: string | null;
  image_url: string | null;
  video_url: string | null;
  achievement_data: any | null;
  poll_options: any | null;
  visibility: "public" | "members_only";
  likes_count: number;
  comments_count: number;
  created_at: string;
  author?: {
    display_name: string;
    avatar_url: string | null;
    level: number;
    class: string | null;
  };
  has_liked?: boolean;
}

export interface GuildComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: {
    display_name: string;
    avatar_url: string | null;
    level: number;
  };
}

export interface CreatePostData {
  guild_id: string;
  post_type: "text" | "image" | "video" | "achievement" | "poll";
  content?: string;
  image_url?: string;
  video_url?: string;
  achievement_data?: any;
  poll_options?: any;
  visibility?: "public" | "members_only";
}

/**
 * Obtener feed de posts de una guild
 */
export async function getGuildFeed(
  guildId: string,
  limit: number = 20,
  offset: number = 0
): Promise<GuildPost[]> {
  const { data, error } = await supabase.rpc("get_guild_feed", {
    p_guild_id: guildId,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Crear un nuevo post en la guild
 */
export async function createGuildPost(
  postData: CreatePostData
): Promise<GuildPost> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado");

  const { data, error } = await supabase
    .from("guild_posts")
    .insert({
      guild_id: postData.guild_id,
      author_id: user.id,
      post_type: postData.post_type,
      content: postData.content || null,
      image_url: postData.image_url || null,
      video_url: postData.video_url || null,
      achievement_data: postData.achievement_data || null,
      poll_options: postData.poll_options || null,
      visibility: postData.visibility || "members_only",
    })
    .select(
      `
      *,
      author:profiles!author_id (
        display_name,
        avatar_url,
        level,
        class
      )
    `
    )
    .single();

  if (error) throw error;
  return data;
}

/**
 * Dar like a un post
 */
export async function likePost(postId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado");

  const { error } = await supabase.from("guild_post_likes").insert({
    post_id: postId,
    user_id: user.id,
  });

  if (error && error.code !== "23505") {
    // Ignorar duplicados
    throw error;
  }
}

/**
 * Quitar like de un post
 */
export async function unlikePost(postId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado");

  const { error } = await supabase
    .from("guild_post_likes")
    .delete()
    .match({ post_id: postId, user_id: user.id });

  if (error) throw error;
}

/**
 * Verificar si el usuario ha dado like a un post
 */
export async function hasLikedPost(postId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("guild_post_likes")
    .select("id")
    .match({ post_id: postId, user_id: user.id })
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return !!data;
}

/**
 * Obtener comentarios de un post
 */
export async function getPostComments(
  postId: string,
  limit: number = 50
): Promise<GuildComment[]> {
  const { data, error } = await supabase
    .from("guild_post_comments")
    .select(
      `
      *,
      author:profiles!user_id (
        display_name,
        avatar_url,
        level
      )
    `
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Crear un comentario en un post
 */
export async function createComment(
  postId: string,
  content: string
): Promise<GuildComment> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado");

  const { data, error } = await supabase
    .from("guild_post_comments")
    .insert({
      post_id: postId,
      user_id: user.id,
      content: content,
    })
    .select(
      `
      *,
      author:profiles!user_id (
        display_name,
        avatar_url,
        level
      )
    `
    )
    .single();

  if (error) throw error;
  return data;
}

/**
 * Eliminar un post (solo el autor o admin)
 */
export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase
    .from("guild_posts")
    .delete()
    .eq("id", postId);

  if (error) throw error;
}

/**
 * Eliminar un comentario (solo el autor)
 */
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from("guild_post_comments")
    .delete()
    .eq("id", commentId);

  if (error) throw error;
}
