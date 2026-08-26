import { NetworkNode, NetworkEdge, VLAN, ValidationIssue } from "@/types";

export interface ValidationContext {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  vlans: VLAN[];
}

export type ValidationRule = (context: ValidationContext) => ValidationIssue[];

export interface ValidationResult {
  issues: ValidationIssue[];
  timestamp: string;
  nodeCount: number;
  edgeCount: number;
}

let issueCounter = 0;

export function createIssueId(): string {
  return `val-${Date.now()}-${++issueCounter}`;
}

export function resetIssueCounter(): void {
  issueCounter = 0;
}
