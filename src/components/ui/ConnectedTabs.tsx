"use client";

import { useState, useEffect, useCallback } from "react";
import { Monitor, Users } from "lucide-react";
import {
  getSyncManager,
  disconnectSync,
  ConnectedTab,
} from "@/lib/sync/multiTabSync";

interface ConnectedTabsProps {
  projectId: string;
}

export function ConnectedTabs({ projectId }: ConnectedTabsProps) {
  const [tabs, setTabs] = useState<ConnectedTab[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const manager = getSyncManager();
    manager.connect(projectId);
    setIsConnected(true);

    const unsubscribe = manager.onTabsChange((connectedTabs) => {
      setTabs(connectedTabs);
    });

    return () => {
      unsubscribe();
      disconnectSync();
      setIsConnected(false);
    };
  }, [projectId]);

  if (tabs.length === 0 && !isConnected) return null;

  return (
    <div className="flex items-center gap-1.5">
      {/* Connection indicator */}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            isConnected ? "bg-green-500" : "bg-gray-400"
          }`}
        />
        <span>Live</span>
      </div>

      {/* Connected tab avatars */}
      {tabs.length > 0 && (
        <div className="flex items-center -space-x-1">
          {tabs.slice(0, 4).map((tab) => (
            <div
              key={tab.tabId}
              className="w-5 h-5 rounded-full border border-background flex items-center justify-center text-[8px] font-bold text-white"
              style={{ backgroundColor: tab.color }}
              title={tab.label}
            >
              {tab.label.slice(-1)}
            </div>
          ))}
          {tabs.length > 4 && (
            <div className="w-5 h-5 rounded-full bg-muted border border-background flex items-center justify-center text-[8px] font-bold">
              +{tabs.length - 4}
            </div>
          )}
        </div>
      )}

      {tabs.length > 0 && (
        <span className="text-[10px] text-muted-foreground">
          {tabs.length} tab{tabs.length > 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
