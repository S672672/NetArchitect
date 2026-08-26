"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProjectStore } from "@/stores/projectStore";
import { useTopologyStore } from "@/stores/topologyStore";
import { useUIStore } from "@/stores/uiStore";
import { DesignerLayout } from "@/components/layout/DesignerLayout";

export default function DesignerPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { currentProject, loadProject, isLoading } = useProjectStore();
  const { loadFromProject, clear } = useTopologyStore();
  const { clearSelection } = useUIStore();

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
    return () => {
      clearSelection();
    };
  }, [projectId, loadProject, clearSelection]);

  useEffect(() => {
    if (currentProject) {
      loadFromProject(
        currentProject.nodes,
        currentProject.edges,
        currentProject.vlans
      );
    }
  }, [currentProject, loadFromProject]);

  useEffect(() => {
    return () => {
      clear();
    };
  }, [clear]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">Project not found</p>
          <button
            onClick={() => router.push("/projects")}
            className="text-sm px-4 py-2 bg-foreground text-background rounded-md"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return <DesignerLayout />;
}
