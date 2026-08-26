"use client";

import { useState } from "react";
import { History, Plus, RotateCcw, ArrowLeftRight, Trash2, Check } from "lucide-react";
import { useTopologyStore } from "@/stores/topologyStore";
import { useProjectStore } from "@/stores/projectStore";
import { createVersion, compareVersions, getNextVersionNumber } from "@/lib/versioning";
import { ArchitectureVersion, VersionDiff } from "@/types";

export function VersionHistoryPanel({ onRestore }: { onRestore: (v: ArchitectureVersion) => void }) {
  const { nodes, edges, vlans } = useTopologyStore();
  const { currentProject } = useProjectStore();
  const [versions, setVersions] = useState<ArchitectureVersion[]>([]);
  const [diffResult, setDiffResult] = useState<VersionDiff | null>(null);

  const projectId = currentProject?.id || "";

  const createSnapshot = (name?: string) => {
    const nextVer = getNextVersionNumber(versions);
    const version = createVersion(
      projectId,
      nextVer,
      name || `${nextVer} — ${new Date().toLocaleDateString()}`,
      nodes, edges, vlans
    );
    setVersions(prev => [...prev, version]);
  };

  const compareTwo = (fromIdx: number, toIdx: number) => {
    const from = versions[fromIdx];
    const to = versions[toIdx];
    if (!from || !to) return;
    const diff = compareVersions(from, to);
    setDiffResult(diff);
  };

  const deleteVersion = (id: string) => {
    setVersions(prev => prev.filter(v => v.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4" />
          <h3 className="text-sm font-semibold">Version History</h3>
        </div>
        <button
          onClick={() => createSnapshot()}
          className="flex items-center gap-1 text-[10px] px-2 py-1 bg-foreground text-background rounded font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3 h-3" />
          Snapshot
        </button>
      </div>

      {versions.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted-foreground">
          <History className="w-6 h-6 mx-auto mb-2 opacity-50" />
          <p>No versions saved yet.</p>
          <p className="mt-1">Create a snapshot to save your current architecture state.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {versions.map((ver, idx) => (
            <div key={ver.id} className="border border-border rounded p-2 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-foreground">{ver.version}</span>
                  <span className="text-xs truncate">{ver.name}</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {ver.snapshot.nodes.length} devices · {ver.snapshot.edges.length} links · {new Date(ver.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {idx > 0 && (
                  <button
                    onClick={() => compareTwo(idx - 1, idx)}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title="Compare with previous"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => onRestore(ver)}
                  className="p-1 hover:bg-muted rounded transition-colors text-blue-500"
                  title="Restore this version"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
                <button
                  onClick={() => deleteVersion(ver.id)}
                  className="p-1 hover:bg-muted rounded transition-colors text-red-500"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Version Diff */}
      {diffResult && (
        <div className="border border-border rounded p-3 space-y-2">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Diff: {diffResult.fromVersion} → {diffResult.toVersion}
          </div>
          {diffResult.changes.length === 0 ? (
            <div className="text-xs text-muted-foreground">No differences</div>
          ) : (
            <div className="space-y-0.5">
              {diffResult.changes.map((change, i) => (
                <div key={i} className={`text-xs flex items-center gap-2 ${
                  change.type === "added" ? "text-green-500" :
                  change.type === "removed" ? "text-red-500" :
                  "text-yellow-500"
                }`}>
                  <span className="w-3">{change.type === "added" ? "+" : change.type === "removed" ? "-" : "~"}</span>
                  <span>{change.entityLabel}</span>
                  {change.details && <span className="text-muted-foreground">({change.details})</span>}
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => setDiffResult(null)}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Close diff
          </button>
        </div>
      )}
    </div>
  );
}
