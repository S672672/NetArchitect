import Dexie, { Table } from "dexie";
import { NetworkProject, AppSettings } from "@/types";

export interface ProjectRecord {
  id: string;
  name: string;
  description?: string;
  nodesJSON: string;
  edgesJSON: string;
  vlansJSON: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface SettingsRecord {
  key: string;
  value: AppSettings;
}

class NetArchitectDB extends Dexie {
  projects!: Table<ProjectRecord>;
  settings!: Table<SettingsRecord>;

  constructor() {
    super("NetArchitectDB");
    this.version(1).stores({
      projects: "id, name, createdAt, updatedAt",
      settings: "key",
    });
  }
}

export const db = new NetArchitectDB();

// ============================================================
// Project CRUD
// ============================================================

export async function saveProject(project: NetworkProject): Promise<void> {
  try {
    const record: ProjectRecord = {
      id: project.id,
      name: project.name,
      description: project.description,
      nodesJSON: JSON.stringify(project.nodes),
      edgesJSON: JSON.stringify(project.edges),
      vlansJSON: JSON.stringify(project.vlans),
      createdAt: project.createdAt,
      updatedAt: new Date().toISOString(),
      version: project.version,
    };
    await db.projects.put(record);
  } catch (error) {
    console.error("Failed to save project:", error);
    throw new Error("Failed to save project to local storage");
  }
}

export async function getProject(id: string): Promise<NetworkProject | null> {
  try {
    const record = await db.projects.get(id);
    if (!record) return null;

    return {
      id: record.id,
      name: record.name,
      description: record.description,
      nodes: JSON.parse(record.nodesJSON),
      edges: JSON.parse(record.edgesJSON),
      vlans: JSON.parse(record.vlansJSON),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      version: record.version,
    };
  } catch (error) {
    console.error("Failed to load project:", error);
    return null;
  }
}

export async function getAllProjects(): Promise<NetworkProject[]> {
  try {
    const records = await db.projects.toArray();
    return records.map((record) => ({
      id: record.id,
      name: record.name,
      description: record.description,
      nodes: JSON.parse(record.nodesJSON),
      edges: JSON.parse(record.edgesJSON),
      vlans: JSON.parse(record.vlansJSON),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      version: record.version,
    }));
  } catch (error) {
    console.error("Failed to load projects:", error);
    return [];
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    await db.projects.delete(id);
  } catch (error) {
    console.error("Failed to delete project:", error);
    throw new Error("Failed to delete project");
  }
}

export async function renameProject(
  id: string,
  newName: string
): Promise<void> {
  try {
    await db.projects.update(id, {
      name: newName,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to rename project:", error);
    throw new Error("Failed to rename project");
  }
}

// ============================================================
// Settings
// ============================================================

const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  autosaveEnabled: true,
  autosaveDelay: 2000,
  validationEnabled: true,
  showGrid: true,
  snapToGrid: false,
  gridSize: 15,
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const record = await db.settings.get("app-settings");
    return record?.value ?? DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await db.settings.put({ key: "app-settings", value: settings });
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}
