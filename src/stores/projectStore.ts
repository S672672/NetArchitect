import { create } from "zustand";
import { NetworkProject } from "@/types";
import {
  saveProject as dbSaveProject,
  getProject as dbGetProject,
  getAllProjects as dbGetAllProjects,
  deleteProject as dbDeleteProject,
  renameProject as dbRenameProject,
} from "@/lib/storage/database";
import { v4 as uuidv4 } from "uuid";

interface ProjectState {
  projects: NetworkProject[];
  currentProject: NetworkProject | null;
  isLoading: boolean;
  saveStatus: "saved" | "saving" | "unsaved";

  loadProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  createProject: (name: string, description?: string) => Promise<string>;
  deleteProject: (id: string) => Promise<void>;
  renameProject: (id: string, name: string) => Promise<void>;
  duplicateProject: (id: string) => Promise<string>;
  updateCurrentProject: (updates: Partial<Pick<NetworkProject, "name" | "description" | "nodes" | "edges" | "vlans">>) => void;
  saveCurrentProject: () => Promise<void>;
  clearCurrentProject: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  saveStatus: "saved",

  loadProjects: async () => {
    set({ isLoading: true });
    try {
      const projects = await dbGetAllProjects();
      set({ projects, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  loadProject: async (id: string) => {
    set({ isLoading: true });
    try {
      const project = await dbGetProject(id);
      set({ currentProject: project, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createProject: async (name: string, description?: string) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const project: NetworkProject = {
      id,
      name,
      description,
      nodes: [],
      edges: [],
      vlans: [],
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    await dbSaveProject(project);
    await get().loadProjects();
    return id;
  },

  deleteProject: async (id: string) => {
    await dbDeleteProject(id);
    if (get().currentProject?.id === id) {
      set({ currentProject: null });
    }
    await get().loadProjects();
  },

  renameProject: async (id: string, name: string) => {
    await dbRenameProject(id, name);
    if (get().currentProject?.id === id) {
      set((state) => ({
        currentProject: state.currentProject
          ? { ...state.currentProject, name }
          : null,
      }));
    }
    await get().loadProjects();
  },

  duplicateProject: async (id: string) => {
    const project = await dbGetProject(id);
    if (!project) return "";
    const newId = uuidv4();
    const now = new Date().toISOString();
    const duplicate: NetworkProject = {
      ...project,
      id: newId,
      name: `${project.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    await dbSaveProject(duplicate);
    await get().loadProjects();
    return newId;
  },

  updateCurrentProject: (updates) => {
    set((state) => {
      if (!state.currentProject) return state;
      const updated = { ...state.currentProject, ...updates, updatedAt: new Date().toISOString() };
      return { currentProject: updated, saveStatus: "unsaved" };
    });
  },

  saveCurrentProject: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    set({ saveStatus: "saving" });
    try {
      await dbSaveProject(currentProject);
      set({ saveStatus: "saved" });
    } catch {
      set({ saveStatus: "unsaved" });
    }
  },

  clearCurrentProject: () => {
    set({ currentProject: null });
  },
}));
