"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Network,
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Copy,
  Pencil,
  Clock,
  Link2,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  Monitor,
} from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { NetworkProject } from "@/types";
import { timeAgo } from "@/lib/utils";
import { getHighestSeverity } from "@/lib/validation";
import { createDemoProject } from "@/lib/demo";
import { validateTopology } from "@/lib/validation";

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" /></div>}>
      <ProjectsPageContent />
    </Suspense>
  );
}

function ProjectsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    projects,
    isLoading,
    loadProjects,
    createProject,
    deleteProject,
    renameProject,
    duplicateProject,
  } = useProjectStore();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"updated" | "created" | "name">("updated");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const loadDemo = async () => {
    const demoProject = createDemoProject();
    await useProjectStore.getState().createProject(demoProject.name, demoProject.description);
    const projects = await useProjectStore.getState().loadProjects();
    // Find the just-created project (last one)
    const allProjects = useProjectStore.getState().projects;
    const latest = allProjects.find((p) => p.name === demoProject.name);
    if (latest) {
      // Update with demo data
      useProjectStore.getState().updateCurrentProject({
        nodes: demoProject.nodes,
        edges: demoProject.edges,
        vlans: demoProject.vlans,
      });
      // Save it
      const project = useProjectStore.getState().currentProject;
      if (project) {
        const { saveCurrentProject } = useProjectStore.getState();
        await saveCurrentProject();
      }
      await loadProjects();
      router.push(`/designer/${latest.id}`);
    }
  };

  useEffect(() => {
    const demo = searchParams.get("demo");
    if (demo === "true") {
      loadDemo();
    }
  }, [searchParams]);

  const filteredProjects = useMemo(() => {
    let filtered = projects;
    if (search) {
      const lower = search.toLowerCase();
      filtered = projects.filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          p.description?.toLowerCase().includes(lower)
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "updated":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case "created":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "name":
          return a.name.localeCompare(b.name);
      }
    });

    return sorted;
  }, [projects, search, sortBy]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const id = await createProject(newName.trim());
    setShowNewDialog(false);
    setNewName("");
    router.push(`/designer/${id}`);
  };

  const handleDelete = async (id: string) => {
    setMenuOpen(null);
    await deleteProject(id);
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    await renameProject(id, editName.trim());
    setEditingId(null);
    setEditName("");
  };

  const handleDuplicate = async (id: string) => {
    setMenuOpen(null);
    await duplicateProject(id);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Network className="w-5 h-5" />
            <span className="font-semibold text-sm">NetArchitect</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/subnet-calculator"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Tools
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {projects.length} project{projects.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadDemo}
              className="text-sm px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
            >
              Load Demo
            </button>
            <button
              onClick={() => setShowNewDialog(true)}
              className="inline-flex items-center gap-2 text-sm px-4 py-2 bg-foreground text-background rounded-md font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>
        </div>

        {/* Search and Sort */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm px-3 py-2 border border-border rounded-md bg-background focus:outline-none"
          >
            <option value="updated">Recently updated</option>
            <option value="created">Created date</option>
            <option value="name">Alphabetical</option>
          </select>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredProjects.length === 0 && (
          <div className="text-center py-20">
            <Network className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-medium mb-1">
              {search ? "No matching projects" : "No projects yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {search
                ? "Try a different search term"
                : "Create your first network design"}
            </p>
            {!search && (
              <button
                onClick={() => setShowNewDialog(true)}
                className="inline-flex items-center gap-2 text-sm px-4 py-2 bg-foreground text-background rounded-md font-medium hover:opacity-90"
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
            )}
          </div>
        )}

        {/* Project Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              menuOpen={menuOpen === project.id}
              editingId={editingId}
              editName={editName}
              onMenuToggle={() =>
                setMenuOpen(menuOpen === project.id ? null : project.id)
              }
              onEdit={(id, name) => {
                setEditingId(id);
                setEditName(name);
                setMenuOpen(null);
              }}
              onSaveRename={handleRename}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onEditNameChange={setEditName}
            />
          ))}
        </div>
      </main>

      {/* New Project Dialog */}
      {showNewDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">New Project</h2>
              <button onClick={() => setShowNewDialog(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Project name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewDialog(false)}
                className="text-sm px-3 py-1.5 border border-border rounded-md hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="text-sm px-3 py-1.5 bg-foreground text-background rounded-md font-medium hover:opacity-90 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  menuOpen,
  editingId,
  editName,
  onMenuToggle,
  onEdit,
  onSaveRename,
  onDelete,
  onDuplicate,
  onEditNameChange,
}: {
  project: NetworkProject;
  menuOpen: boolean;
  editingId: string | null;
  editName: string;
  onMenuToggle: () => void;
  onEdit: (id: string, name: string) => void;
  onSaveRename: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onEditNameChange: (name: string) => void;
}) {
  const validation = validateTopology(project.nodes, project.edges, project.vlans);
  const highestSeverity = getHighestSeverity(validation.issues);

  const severityColor =
    highestSeverity === "critical"
      ? "text-red-500"
      : highestSeverity === "error"
      ? "text-orange-500"
      : highestSeverity === "warning"
      ? "text-yellow-600"
      : "text-green-500";

  const severityLabel =
    highestSeverity === "critical"
      ? "Critical issues"
      : highestSeverity === "error"
      ? "Errors detected"
      : highestSeverity === "warning"
      ? "Warnings"
      : "No critical issues";

  const SeverityIcon =
    highestSeverity && ["critical", "error"].includes(highestSeverity)
      ? AlertTriangle
      : CheckCircle2;

  return (
    <Link
      href={`/designer/${project.id}`}
      className="block border border-border rounded-lg p-5 bg-card hover:border-ring transition-colors group relative"
    >
      {editingId === project.id ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => onEditNameChange(e.target.value)}
          onBlur={() => onSaveRename(project.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSaveRename(project.id);
            if (e.key === "Escape") onEdit(project.id, project.name);
          }}
          autoFocus
          onClick={(e) => e.preventDefault()}
          className="w-full font-medium text-sm mb-3 px-1 py-0.5 border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
      ) : (
        <h3 className="font-medium text-sm mb-3 pr-8">{project.name}</h3>
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <Monitor className="w-3.5 h-3.5" />
          {project.nodes.length} Devices
        </span>
        <span className="flex items-center gap-1">
          <Link2 className="w-3.5 h-3.5" />
          {project.edges.length} Connections
        </span>
      </div>

      <div className={`flex items-center gap-1.5 text-xs ${severityColor}`}>
        <SeverityIcon className="w-3.5 h-3.5" />
        <span>{severityLabel}</span>
      </div>

      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-3">
        <Clock className="w-3 h-3" />
        {timeAgo(project.updatedAt)}
      </div>

      {/* Menu */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onMenuToggle();
        }}
        className="absolute top-4 right-4 p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {menuOpen && (
        <div
          className="absolute top-10 right-4 bg-card border border-border rounded-md shadow-lg py-1 z-10 w-36"
          onClick={(e) => e.preventDefault()}
        >
          <button
            onClick={() => onEdit(project.id, project.name)}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2"
          >
            <Pencil className="w-3.5 h-3.5" /> Rename
          </button>
          <button
            onClick={() => onDuplicate(project.id)}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2"
          >
            <Copy className="w-3.5 h-3.5" /> Duplicate
          </button>
          <button
            onClick={() => onDelete(project.id)}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted text-red-500 flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      )}
    </Link>
  );
}
