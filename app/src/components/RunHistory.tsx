'use client';
import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import {
  clearRunSlugsFromCookie,
  getRunSlugsFromCookie,
  setRunSlugsInCookie,
} from "../utils/runCookies";

interface HistoryRun {
  id: string;
  slug: string;
  endpoints: { url: string; method: string; name?: string }[];
  requestCount: number;
  status: string;
  createdAt: string;
  shareUrl: string;
}

interface RunHistoryProps {
  onOpenRun?: (slug: string) => void;
  activeSlug?: string | null;
  reloadKey?: number;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function hostLabel(run: HistoryRun): string {
  const first = run.endpoints[0];
  if (!first) return "Untitled run";
  if (first.name) return first.name;
  try {
    const u = new URL(first.url);
    return `${u.host}${u.pathname}`.replace(/\/$/, "");
  } catch {
    return first.url;
  }
}

const RunHistory: React.FC<RunHistoryProps> = ({
  onOpenRun,
  activeSlug,
  reloadKey,
  collapsed = false,
  onToggleCollapsed,
}) => {
  const [runs, setRuns] = useState<HistoryRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchRuns = async () => {
      setLoading(true);
      setError(null);

      const slugs = getRunSlugsFromCookie();
      if (slugs.length === 0) {
        setRuns([]);
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/api/runs`, {
          params: { slugs: slugs.join(",") },
        });
        const fetched: HistoryRun[] = response.data.runs || [];
        if (!cancelled) {
          setRuns(fetched);

          const foundSlugs = new Set(fetched.map((run) => run.slug));
          const prunedSlugs = slugs.filter((slug) => foundSlugs.has(slug));
          if (prunedSlugs.length !== slugs.length) {
            setRunSlugsInCookie(prunedSlugs);
          }
        }
      } catch (err) {
        console.error("Error loading run history:", err);
        if (!cancelled) setError("Could not load your runs.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRuns();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const openRun = (slug: string) => {
    if (onOpenRun) {
      onOpenRun(slug);
      return;
    }
    window.history.pushState({}, "", `/r/${slug}`);
    window.location.reload();
  };

  const clearHistory = () => {
    if (window.confirm("Clear all your local run history?")) {
      clearRunSlugsFromCookie();
      setRuns([]);
    }
  };

  return (
    <aside
      className={`sidebar ${collapsed ? "sidebar-collapsed" : ""}`}
      aria-label="Your runs"
    >
      {collapsed ? (
        <button
          type="button"
          className="sidebar-expand"
          onClick={onToggleCollapsed}
          aria-label="Show run history"
          title="Show run history"
        >
          Runs
        </button>
      ) : (
        <>
          <div className="sidebar-header">
            <div className="sidebar-heading">// history</div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {runs.length > 0 && (
                <button
                  type="button"
                  className="sidebar-collapse"
                  onClick={clearHistory}
                  title="Clear history"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                className="sidebar-collapse"
                onClick={onToggleCollapsed}
                aria-label="Hide run history"
                title="Hide run history"
              >
                Hide
              </button>
            </div>
          </div>
          {loading && <p className="sidebar-muted">Loading…</p>}
          {error && <p className="sidebar-error">{error}</p>}
          {!loading && !error && runs.length === 0 && (
            <p className="sidebar-muted">No runs yet. Run your first test.</p>
          )}

          <ul className="sidebar-list">
            {runs.map((run) => (
              <li key={run.id}>
                <button
                  type="button"
                  className={`sidebar-item ${activeSlug === run.slug ? "active" : ""}`}
                  onClick={() => openRun(run.slug)}
                >
                  <span className="sidebar-item-title">{hostLabel(run)}</span>
                  <span className="sidebar-item-meta">
                    <span
                      className={`sidebar-status status-${run.status}`}
                      aria-hidden="true"
                    />
                    {run.endpoints.length} endpoint
                    {run.endpoints.length !== 1 ? "s" : ""},{" "}
                    {timeAgo(run.createdAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
};

export default RunHistory;
