"use client";

import { useState, useTransition } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { AiBox } from "@/components/ai/ai-box";
import { CategoryBadge } from "@/components/category-badge";
import { Favicon, LinkThumb } from "@/components/links/link-thumb";
import { Button, buttonVariants } from "@/components/ui/button";
import { deleteLink, refetchLink, saveLinkNote, setLinkCategory } from "../actions";

type Cat = { id: string; name: string; color: string };
type Detail = {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  site_name: string;
  image_url: string | null;
  favicon_url: string | null;
  keywords: string[];
  category_id: string | null;
  suggested_category_id: string | null;
  fetch_status: string;
  note: string | null;
  lines: string[];
  saved: string;
};

export function LinkDetail({ link, categories }: { link: Detail; categories: Cat[] }) {
  const [note, setNote] = useState(link.note ?? "");
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, start] = useTransition();
  const byId = new Map(categories.map((c) => [c.id, c]));
  const category = link.category_id ? byId.get(link.category_id) : undefined;
  const suggested = link.suggested_category_id ? byId.get(link.suggested_category_id) : undefined;
  const pending = link.fetch_status === "pending";

  const run = (fn: () => Promise<{ ok?: boolean; error?: string }>, ok: string) =>
    start(async () => {
      const res = await fn();
      setMsg(res.error ? { error: res.error } : { ok });
    });

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border bg-card">
      <LinkThumb imageUrl={link.image_url} faviconUrl={link.favicon_url} siteName={link.site_name} className="max-h-80" />
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Favicon url={link.favicon_url} />
            <span className="truncate">{link.site_name}</span>
            <span>· saved {link.saved}</span>
          </div>
          <h1 className="text-xl font-semibold break-words">{link.title ?? link.url}</h1>
          {link.description && <p className="text-sm text-muted-foreground">{link.description}</p>}
          <div>
            <a href={link.url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <ExternalLink /> Open original
            </a>
          </div>
        </header>

        {pending ? (
          <p className="text-sm text-muted-foreground">Fetching preview and summary…</p>
        ) : link.lines.length > 0 ? (
          <AiBox title="Summary">
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {link.lines.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
            {link.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {link.keywords.map((k) => (
                  <span key={k} className="rounded-full border border-ai-foreground/30 px-2 py-0.5 text-xs">
                    {k}
                  </span>
                ))}
              </div>
            )}
            {suggested && suggested.id !== link.category_id && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span>Suggested category:</span>
                <CategoryBadge name={suggested.name} color={suggested.color} />
                <Button size="xs" variant="outline" disabled={busy} onClick={() => run(() => setLinkCategory(link.id, suggested.id), "Category applied.")}>
                  Apply
                </Button>
              </div>
            )}
          </AiBox>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {link.fetch_status === "failed" ? "This page couldn't be fetched, so there's no summary." : "No summary for this link."}
            </p>
            <Button size="xs" variant="ghost" disabled={busy} onClick={() => run(() => refetchLink(link.id), "Fetching again…")}>
              <RefreshCw /> Try again
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="link-category" className="text-sm font-medium">
            Category
          </label>
          <div className="flex items-center gap-2">
            <select
              id="link-category"
              value={link.category_id ?? ""}
              disabled={busy}
              onChange={(e) => run(() => setLinkCategory(link.id, e.target.value || null), "Category saved.")}
              className="h-8 rounded-lg border border-input bg-card px-2 text-sm"
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {category && <CategoryBadge name={category.name} color={category.color} />}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="link-note" className="text-sm font-medium">
            My memo
          </label>
          <textarea
            id="link-note"
            rows={5}
            maxLength={10000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full resize-y rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <div>
            {/* The one primary (pink) button on this screen. */}
            <Button size="sm" disabled={busy || note === (link.note ?? "")} onClick={() => run(() => saveLinkNote(link.id, note), "Memo saved.")}>
              Save memo
            </Button>
          </div>
        </div>

        {msg?.ok && <p className="text-sm text-muted-foreground">{msg.ok}</p>}
        {msg?.error && <p className="text-sm text-destructive">{msg.error}</p>}

        <div className="border-t pt-4">
          {confirmDelete ? (
            <Button size="sm" variant="destructive" disabled={busy} onClick={() => start(async () => void (await deleteLink(link.id)))}>
              Confirm delete
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
              Delete link
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
