import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getTranslations } from "next-intl/server";

/** Replace a note's tags with `names` (creates missing tags). Returns an error message or null. */
export async function setNoteTags(supabase: SupabaseClient<Database>, noteId: string, names: string[]): Promise<string | null> {
  if (names.length) {
    const { error } = await supabase
      .from("tags")
      .upsert(names.map((name) => ({ name })), { onConflict: "user_id,name", ignoreDuplicates: true });
    if (error) return (await getTranslations())("notes.errors.tags");
  }
  const { data: tags } = names.length
    ? await supabase.from("tags").select("id, name").in("name", names)
    : { data: [] as { id: string; name: string }[] };
  const wanted = new Set((tags ?? []).map((t) => t.id));

  const { data: current } = await supabase.from("note_tags").select("tag_id").eq("note_id", noteId);
  const have = new Set((current ?? []).map((r) => r.tag_id));
  const toRemove = [...have].filter((id) => !wanted.has(id));
  const toAdd = [...wanted].filter((id) => !have.has(id));

  if (toRemove.length) await supabase.from("note_tags").delete().eq("note_id", noteId).in("tag_id", toRemove);
  if (toAdd.length) {
    const { error } = await supabase.from("note_tags").insert(toAdd.map((tag_id) => ({ note_id: noteId, tag_id })));
    if (error) return (await getTranslations())("notes.errors.tags");
  }
  return null;
}
