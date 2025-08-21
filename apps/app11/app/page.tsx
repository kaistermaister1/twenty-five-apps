"use client";

import { useEffect, useMemo, useState } from "react";
import { useSwipeable } from "react-swipeable";
import { z } from "zod";

const inputSchema = z.object({
  url: z.string().url()
});

function parseLoomEmbedUrl(loomUrl: string): { embedUrl: string; shareId: string } | null {
  try {
    const url = new URL(loomUrl);
    const host = url.hostname.replace("www.", "");

    // Supported patterns:
    // https://www.loom.com/share/<id>
    // https://www.loom.com/embed/<id>
    // https://loom.com/share/<id>
    // https://loom.com/<id>
    let shareId = "";
    const parts = url.pathname.split("/").filter(Boolean);
    if (host === "loom.com") {
      if (parts[0] === "share" || parts[0] === "embed") {
        shareId = parts[1] || "";
      } else {
        shareId = parts[0] || "";
      }
    } else if (host === "loom.com" || host === "loom.tv") {
      shareId = parts[parts.length - 1] || "";
    } else if (host === "loom.com" || host === "www.loom.com") {
      shareId = parts[parts.length - 1] || "";
    } else if (host === "cdn.loom.com") {
      // cdn links are typically embed-only; try last path segment
      shareId = parts[parts.length - 1] || "";
    } else {
      if (url.hostname.includes("loom.com")) {
        shareId = parts[parts.length - 1] || "";
      }
    }

    if (!shareId) return null;
    return {
      embedUrl: `https://www.loom.com/embed/${shareId}`,
      shareId
    };
  } catch {
    return null;
  }
}

type Board = { id: string; name: string };
type Group = { id: string; title: string };

async function mondayFetch(options: { token: string; query: string; variables?: any }) {
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: options.token,
      "API-Version": "2023-10"
    },
    body: JSON.stringify({ query: options.query, variables: options.variables ?? {} })
  });
  const data = await res.json();
  if (!res.ok || data?.errors) {
    throw new Error(data?.errors?.[0]?.message || "monday.com request failed");
  }
  return data;
}

export default function Page() {
  const [input, setInput] = useState("");
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"passed" | "failed" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [apiToken, setApiToken] = useState<string>("");
  const [boardId, setBoardId] = useState<string>("");
  const [groupSource, setGroupSource] = useState<string>("");
  const [groupPassed, setGroupPassed] = useState<string>("");
  const [groupFailed, setGroupFailed] = useState<string>("");
  const [linkColumnId, setLinkColumnId] = useState<string>("");
  const [boards, setBoards] = useState<Board[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [linking, setLinking] = useState<boolean>(false);
  const [reviewQueue, setReviewQueue] = useState<Array<{ itemId: string; url: string; name: string }>>([]);
  const [queueIndex, setQueueIndex] = useState<number>(0);

  // Load saved settings from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("monday_token") || "";
    const savedBoardId = localStorage.getItem("monday_board_id") || "";
    const savedGroupSource = localStorage.getItem("monday_group_source") || "";
    const savedGroupPassed = localStorage.getItem("monday_group_passed") || "";
    const savedGroupFailed = localStorage.getItem("monday_group_failed") || "";
    const savedLinkCol = localStorage.getItem("monday_link_col") || "";
    if (savedToken) setApiToken(savedToken);
    if (savedBoardId) setBoardId(savedBoardId);
    if (savedGroupSource) setGroupSource(savedGroupSource);
    if (savedGroupPassed) setGroupPassed(savedGroupPassed);
    if (savedGroupFailed) setGroupFailed(savedGroupFailed);
    if (savedLinkCol) setLinkColumnId(savedLinkCol);
  }, []);

  // Persist settings
  useEffect(() => {
    if (apiToken) localStorage.setItem("monday_token", apiToken);
  }, [apiToken]);
  useEffect(() => {
    if (boardId) localStorage.setItem("monday_board_id", boardId);
  }, [boardId]);
  useEffect(() => {
    if (groupSource) localStorage.setItem("monday_group_source", groupSource);
  }, [groupSource]);
  useEffect(() => {
    if (groupPassed) localStorage.setItem("monday_group_passed", groupPassed);
  }, [groupPassed]);
  useEffect(() => {
    if (groupFailed) localStorage.setItem("monday_group_failed", groupFailed);
  }, [groupFailed]);
  useEffect(() => {
    if (linkColumnId) localStorage.setItem("monday_link_col", linkColumnId);
  }, [linkColumnId]);

  async function fetchBoards() {
    if (!apiToken) return;
    try {
      setMessage(null);
      const data = await mondayFetch({
        token: apiToken,
        query: `query { boards (limit: 50) { id name } }`
      });
      const items = (data?.data?.boards || []) as Array<{ id: string; name: string }>;
      setBoards(items);
    } catch (e: any) {
      setMessage(e?.message || "Failed to load boards");
    }
  }

  async function fetchGroups(selectedBoardId: string) {
    if (!apiToken || !selectedBoardId) return;
    try {
      setMessage(null);
      const data = await mondayFetch({
        token: apiToken,
        query: `query ($id: [ID!]) { boards (ids: $id) { id groups { id title } } }`,
        variables: { id: Number(selectedBoardId) }
      });
      const grp = (data?.data?.boards?.[0]?.groups || []) as Array<{ id: string; title: string }>;
      setGroups(grp);
    } catch (e: any) {
      setMessage(e?.message || "Failed to load groups");
    }
  }

  const embed = useMemo(() => {
    if (!currentUrl) return null;
    return parseLoomEmbedUrl(currentUrl);
  }, [currentUrl]);

  // Load items from selected source group and column
  async function loadFromSourceGroup() {
    if (!apiToken) {
      setMessage("Link your monday.com token first.");
      return;
    }
    if (!boardId || !groupSource || !linkColumnId) {
      setMessage("Choose board, Source group, and Link column id first.");
      return;
    }
    try {
      setMessage(null);
      // Fetch items and their link column values; filter by group client-side
      const data = await mondayFetch({
        token: apiToken,
        query: `query ($boardId: [ID!], $colIds: [String!]) {
          boards(ids: $boardId) {
            items_page(limit: 500) {
              items { id name group { id } column_values(ids: $colIds) { id text value } }
            }
          }
        }`,
        variables: { boardId: Number(boardId), colIds: [linkColumnId] }
      });
      const items = (data?.data?.boards?.[0]?.items_page?.items || []) as Array<{
        id: string; name: string; group?: { id?: string }; column_values?: Array<{ id: string; text?: string; value?: string }>
      }>;
      const inGroup = items.filter(i => i?.group?.id === groupSource);
      const queue: Array<{ itemId: string; url: string; name: string }> = [];
      for (const it of inGroup) {
        const cv = (it.column_values || [])[0];
        if (!cv) continue;
        let url: string | null = null;
        if (cv.value) {
          try {
            const parsed = JSON.parse(cv.value);
            if (parsed && typeof parsed.url === "string" && parsed.url) url = parsed.url;
          } catch {}
        }
        if (!url && cv.text && /^https?:\/\//.test(cv.text)) url = cv.text;
        if (url) queue.push({ itemId: it.id, url, name: it.name || "" });
      }
      if (!queue.length) {
        setReviewQueue([]);
        setQueueIndex(0);
        setCurrentItemId(null);
        setCurrentUrl(null);
        setMessage("No links found in the selected group/column.");
        return;
      }
      setReviewQueue(queue);
      setQueueIndex(0);
      setCurrentItemId(queue[0].itemId);
      setCurrentUrl(queue[0].url);
      setMessage(`Loaded ${queue.length} item${queue.length === 1 ? "" : "s"} from Source group.`);
    } catch (e: any) {
      setMessage(e?.message || "Failed to load items from group");
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const parsed = inputSchema.safeParse({ url: input.trim() });
    if (!parsed.success) {
      setMessage("Please paste a valid Loom URL.");
      return;
    }
    const emb = parseLoomEmbedUrl(parsed.data.url);
    if (!emb) {
      setMessage("Could not understand that Loom link.");
      return;
    }
    setCurrentUrl(parsed.data.url);
    setCurrentItemId(null); // manual URL, not tied to a specific item
  };

  async function sendDecision(decision: "passed" | "failed") {
    if (!currentUrl) return;
    if (!apiToken) {
      setMessage("Link your monday.com token first.");
      return;
    }
    if (!boardId || !groupPassed || !groupFailed) {
      setMessage("Choose your board and Passed/Failed groups first.");
      return;
    }
    setSubmitting(decision);
    setMessage(null);
    try {
      const emb = parseLoomEmbedUrl(currentUrl);
      const loomId = emb?.shareId || currentUrl;
      const targetGroup = decision === "passed" ? groupPassed : groupFailed;

      if (currentItemId) {
        // If reviewing an item loaded from the source group, move that exact item
        await mondayFetch({
          token: apiToken,
          query: `mutation ($itemId: ID!, $groupId: String!, $name: String!) {
            move_item_to_group (item_id: $itemId, group_id: $groupId) { id }
            change_item_name (item_id: $itemId, new_name: $name) { id }
          }`,
          variables: {
            itemId: currentItemId,
            groupId: targetGroup,
            name: `${decision === "passed" ? "✅" : "❌"} ${loomId}`
          }
        });
        setMessage(decision === "passed" ? "Moved to Passed" : "Moved to Failed");
      } else {
        // Manual URL mode: find by name or create as before
        const search = await mondayFetch({
          token: apiToken,
          query: `query ($boardId: [ID!], $term: String!) {
            boards(ids: $boardId) {
              items_page(limit: 10, query_params: { rules: [{column_id: "name", compare_value: $term, operator: contains_text}] }) {
                items { id name }
              }
            }
          }`,
          variables: { boardId: Number(boardId), term: loomId }
        });
        const existing = (search?.data?.boards?.[0]?.items_page?.items || []) as Array<{ id: string; name: string }>;
        const match = existing.find(i => typeof i?.name === "string" && i.name.includes(loomId));
        if (match?.id) {
          await mondayFetch({
            token: apiToken,
            query: `mutation ($itemId: ID!, $groupId: String!, $name: String!) {
              move_item_to_group (item_id: $itemId, group_id: $groupId) { id }
              change_item_name (item_id: $itemId, new_name: $name) { id }
            }`,
            variables: {
              itemId: match.id,
              groupId: targetGroup,
              name: `${decision === "passed" ? "✅" : "❌"} ${loomId}`
            }
          });
          setMessage(decision === "passed" ? "Updated and moved to Passed" : "Updated and moved to Failed");
        } else {
          if (linkColumnId) {
            await mondayFetch({
              token: apiToken,
              query: `mutation ($boardId: ID!, $groupId: String!, $name: String!, $values: JSON!) {
                create_item (board_id: $boardId, group_id: $groupId, item_name: $name, column_values: $values) { id }
              }`,
              variables: {
                boardId: Number(boardId),
                groupId: targetGroup,
                name: `${decision === "passed" ? "✅" : "❌"} ${loomId}`,
                values: JSON.stringify({ [linkColumnId]: { url: currentUrl, text: "Loom" } })
              }
            });
          } else {
            await mondayFetch({
              token: apiToken,
              query: `mutation ($boardId: ID!, $groupId: String!, $name: String!) {
                create_item (board_id: $boardId, group_id: $groupId, item_name: $name) { id }
              }`,
              variables: {
                boardId: Number(boardId),
                groupId: targetGroup,
                name: `${decision === "passed" ? "✅" : "❌"} ${loomId}`
              }
            });
          }
          setMessage(decision === "passed" ? "Created in Passed" : "Created in Failed");
        }
      }

      // Advance queue if applicable
      if (reviewQueue.length) {
        const nextIndex = queueIndex + 1;
        if (nextIndex < reviewQueue.length) {
          setQueueIndex(nextIndex);
          setCurrentItemId(reviewQueue[nextIndex].itemId);
          setCurrentUrl(reviewQueue[nextIndex].url);
        } else {
          setQueueIndex(0);
          setReviewQueue([]);
          setCurrentItemId(null);
          setCurrentUrl(null);
          setMessage(prev => prev ? `${prev} • Review queue completed.` : "Review queue completed.");
        }
      }
    } catch (err: any) {
      setMessage(err?.message || "Something went wrong");
    } finally {
      setSubmitting(null);
    }
  }

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => sendDecision("failed"),
    onSwipedRight: () => sendDecision("passed"),
    trackMouse: true,
    preventScrollOnSwipe: true
  });

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">Loom Reviewer</h1>
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setLinking(v => !v)}
            className="rounded-lg bg-sky-600 px-3 py-2 text-white shadow hover:bg-sky-700"
          >
            {linking ? "Close" : "Link account"}
          </button>
          {apiToken ? <span className="text-sm text-emerald-700">Linked</span> : <span className="text-sm text-slate-600">Not linked</span>}
        </div>
        {linking && (
          <div className="mt-3 grid gap-3">
            <p className="text-sm text-slate-600">Paste your monday.com API token. It stays in your browser (localStorage).</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm" placeholder="API token" value={apiToken} onChange={(e)=>setApiToken(e.target.value)} />
              <button type="button" onClick={fetchBoards} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 shadow hover:bg-slate-100">Load boards</button>
            </div>
            {boards.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-4">
                <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm" value={boardId} onChange={(e)=>{ setBoardId(e.target.value); fetchGroups(e.target.value); }}>
                  <option value="">Select board…</option>
                  {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm" value={groupSource} onChange={(e)=>setGroupSource(e.target.value)} disabled={!groups.length}>
                  <option value="">Source group…</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
                <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm" value={groupPassed} onChange={(e)=>setGroupPassed(e.target.value)} disabled={!groups.length}>
                  <option value="">Passed group…</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
                <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm" value={groupFailed} onChange={(e)=>setGroupFailed(e.target.value)} disabled={!groups.length}>
                  <option value="">Failed group…</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm" placeholder="Link column id to pull URLs from (e.g. link)" value={linkColumnId} onChange={(e)=>setLinkColumnId(e.target.value)} />
              <button type="button" onClick={loadFromSourceGroup} className="rounded-lg bg-sky-600 px-3 py-2 text-white shadow hover:bg-sky-700" disabled={!boardId || !groupSource || !linkColumnId}>Load from Source group</button>
            </div>
          </div>
        )}
      </div>
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm focus:ring-2 focus:ring-sky-400"
          placeholder="Paste a Loom link… (or load from Source group above)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-lg bg-sky-600 px-4 py-2 font-medium text-white shadow hover:bg-sky-700 disabled:opacity-50"
          disabled={!input}
        >
          Load
        </button>
      </form>

      {embed && (
        <div {...swipeHandlers} className="select-none">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            <iframe
              className="absolute inset-0 h-full w-full"
              src={embed.embedUrl}
              allow="autoplay; fullscreen"
            />
          </div>
          {reviewQueue.length > 0 && (
            <div className="mt-2 text-sm text-slate-600">Item {queueIndex + 1} of {reviewQueue.length}: {reviewQueue[queueIndex]?.name}</div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => sendDecision("failed")}
              disabled={submitting !== null}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-medium text-red-700 shadow hover:bg-red-100 disabled:opacity-50"
            >
              ← Fail
            </button>
            <button
              onClick={() => sendDecision("passed")}
              disabled={submitting !== null}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 font-medium text-emerald-700 shadow hover:bg-emerald-100 disabled:opacity-50"
            >
              Pass →
            </button>
          </div>
          <p className="text-sm text-slate-600">Tip: swipe right to Pass, left to Fail</p>
        </div>
      )}

      {message && <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{message}</div>}
    </main>
  );
}


