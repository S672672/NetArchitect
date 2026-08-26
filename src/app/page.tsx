"use client";

import Link from "next/link";
import {
  Network,
  Shield,
  Calculator,
  Layers,
  Lock,
  HardDrive,
  Download,
  ArrowRight,
  Check,
  Eye,
  AlertTriangle,
  GitBranch,
  Terminal,
  DollarSign,
  Zap,
  Monitor,
  Command,
  BarChart3,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const FEATURES = [
  {
    icon: Network,
    title: "Visual Network Design",
    description:
      "Drag and drop 18 device types to build your network topology. Connect routers, switches, servers, and clients with visual clarity.",
  },
  {
    icon: Shield,
    title: "Architecture Validation",
    description:
      "9 automated rules detect single points of failure, insecure paths, subnet overlap, missing gateways, and more.",
  },
  {
    icon: BarChart3,
    title: "Network Health Score",
    description:
      "Get a single health score (A+ to F) with breakdowns for security, reliability, configuration, and best practices.",
  },
  {
    icon: Terminal,
    title: "Config Generation",
    description:
      "Export to real Cisco IOS configs, iptables rules, ASCII topology diagrams, and Markdown documentation.",
  },
  {
    icon: DollarSign,
    title: "Cost Estimator",
    description:
      "Automatically estimate equipment costs, cabling, monthly recurring, and get optimization recommendations.",
  },
  {
    icon: Zap,
    title: "Live Multi-Tab Sync",
    description:
      "Open the same project in two tabs and see changes sync in real-time. No server required — uses BroadcastChannel API.",
  },
  {
    icon: Command,
    title: "Command Palette",
    description:
      "Press Ctrl+K for VS Code-style command palette. Access all actions, add devices, switch themes, navigate instantly.",
  },
  {
    icon: GitBranch,
    title: "Traffic Flow Analysis",
    description:
      "Visualize shortest paths between devices. Animated packet flow simulation shows real traffic traversal.",
  },
];

const STEPS = [
  { number: "1", title: "Design", description: "Build your network topology" },
  { number: "2", title: "Configure", description: "Set IPs, VLANs, gateways" },
  { number: "3", title: "Validate", description: "Run architecture analysis" },
  { number: "4", title: "Export", description: "Share or deploy your design" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-foreground" />
            <span className="font-semibold text-sm">NetVerge</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/projects"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Projects
            </Link>
            <Link
              href="/subnet-calculator"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Tools
            </Link>
            <Link
              href="/projects"
              className="text-sm px-4 py-1.5 bg-foreground text-background rounded-md font-medium hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight mb-6">
            Design. Validate. Understand Your Network.
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Build network infrastructure visually, detect architectural
            problems, calculate subnets, and validate your topology — entirely
            in your browser.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-foreground text-background rounded-md font-medium text-sm hover:opacity-90 transition-opacity"
            >
              Start Designing
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/projects?demo=true"
              className="inline-flex items-center gap-2 px-6 py-2.5 border border-border rounded-md font-medium text-sm hover:bg-muted transition-colors"
            >
              Explore Demo
            </Link>
          </div>
        </div>

        {/* Visual Preview */}
        <div className="mt-16 max-w-3xl mx-auto">
          <div className="border border-border rounded-lg bg-card p-6 overflow-hidden">
            <div className="flex items-center gap-1.5 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="flex flex-col items-center gap-2 font-mono text-xs text-muted-foreground">
              <DeviceInfo label="Internet" color="#64748b" />
              <div className="w-px h-4 bg-border" />
              <DeviceInfo label="Firewall" color="#ef4444" />
              <div className="w-px h-4 bg-border" />
              <DeviceInfo label="Core Switch" color="#6366f1" />
              <div className="flex items-start gap-16 mt-1">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-px h-4 bg-border" />
                  <DeviceInfo label="Servers" color="#10b981" />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-px h-4 bg-border" />
                  <DeviceInfo label="Users" color="#f59e0b" />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-px h-4 bg-border" />
                  <DeviceInfo label="IoT" color="#92400e" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-bold mb-2">Everything you need</h2>
          <p className="text-muted-foreground mb-12">
            A complete network design and validation toolkit
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="border border-border rounded-lg p-5 bg-card"
              >
                <feature.icon className="w-5 h-5 mb-3 text-foreground" />
                <h3 className="font-medium text-sm mb-1.5">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-bold mb-2">How it works</h2>
          <p className="text-muted-foreground mb-12">
            Four steps from concept to validated design
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8">
            {STEPS.map((step, i) => (
              <div
                key={step.number}
                className="flex flex-col items-center text-center"
              >
                <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-sm mb-3">
                  {step.number}
                </div>
                <h3 className="font-medium text-sm mb-1">{step.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {step.description}
                </p>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="hidden sm:block w-4 h-4 text-muted-foreground/50 mt-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Validation Examples */}
      <section className="border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-bold mb-2">Intelligent validation</h2>
          <p className="text-muted-foreground mb-12">
            NetVerge actively analyzes your topology and provides actionable
            feedback
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ValidationExample
              severity="critical"
              icon={<Shield className="w-4 h-4" />}
              title="Public Database Exposure"
              description="The database server is reachable from the Internet without a firewall in the path."
            />
            <ValidationExample
              severity="error"
              icon={<AlertTriangle className="w-4 h-4" />}
              title="Single Point of Failure"
              description="Core Switch has no redundant connection. If it fails, servers and users become isolated."
            />
            <ValidationExample
              severity="warning"
              icon={<Layers className="w-4 h-4" />}
              title="Missing VLAN Segmentation"
              description="IoT devices share the same network segment as employee workstations."
            />
          </div>
        </div>
      </section>

      {/* Technical Depth — Why This Stands Out */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-bold mb-2">
            Built with real engineering
          </h2>
          {/* <p className="text-muted-foreground mb-12">
            Not a CRUD app. This is a graph-theory-powered network analysis tool.
          </p> */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-border rounded-lg p-5 bg-card">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded bg-foreground/10 flex items-center justify-center">
                  <span className="text-sm font-mono font-bold">G</span>
                </div>
                <h3 className="font-medium text-sm">Graph Algorithms</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Articulation point detection for single points of failure.
                BFS/DFS for path analysis and reachability. Minimum spanning
                tree validation for network redundancy.
              </p>
            </div>
            <div className="border border-border rounded-lg p-5 bg-card">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded bg-foreground/10 flex items-center justify-center">
                  <span className="text-sm font-mono font-bold">IP</span>
                </div>
                <h3 className="font-medium text-sm">Real IP/CIDR Math</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Bitwise subnet mask calculations, not string parsing. Subnet
                splitting, overlap detection, wildcard masks, and binary
                representation — all mathematically correct.
              </p>
            </div>
            <div className="border border-border rounded-lg p-5 bg-card">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded bg-foreground/10 flex items-center justify-center">
                  <span className="text-sm font-mono font-bold">⚡</span>
                </div>
                <h3 className="font-medium text-sm">Config Generation</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Generates real Cisco IOS configs with interface declarations,
                ACLs, and NAT rules. iptables with FORWARD chains, MASQUERADE,
                and per-device security policies.
              </p>
            </div>
          </div>

          {/* Tech Stack Callout */}
          {/* <div className="mt-12 border border-border rounded-lg bg-card p-6">
            <h3 className="font-medium text-sm mb-4">Architecture & Tech Stack</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Next.js 16", sub: "React + TypeScript" },
                { label: "React Flow", sub: "Node-based canvas" },
                { label: "Zustand", sub: "5 separated stores" },
                { label: "Dexie", sub: "IndexedDB wrapper" },
                { label: "Graph Theory", sub: "BFS, articulation points" },
                { label: "BroadcastChannel", sub: "Real-time tab sync" },
                { label: "html-to-image", sub: "PNG/SVG export" },
                { label: "Vitest", sub: "38 unit tests" },
              ].map((tech) => (
                <div key={tech.label} className="text-center">
                  <div className="text-sm font-medium mb-0.5">{tech.label}</div>
                  <div className="text-[10px] text-muted-foreground">{tech.sub}</div>
                </div>
              ))}
            </div>
          </div> */}
        </div>
      </section>

      {/* Privacy */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <Lock className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-3">Your data stays yours</h2>
          <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed text-sm">
            {/* NetVerge is a local-first application. No network topology data is ever
            uploaded to a server. All projects are stored in your browser&apos;s IndexedDB.
            No accounts, no cloud storage, no tracking. */}
            Design, validate, and simulate network infrastructure locally —
            keeping sensitive topology data under your control.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Network className="w-4 h-4" />
            <span>NetVerge</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Built for network engineers, by network engineers.
          </p>
        </div>
      </footer>
    </div>
  );
}

function DeviceInfo({ label, color }: { label: string; color: string }) {
  return (
    <div
      className="px-3 py-1.5 rounded-md border text-xs font-medium"
      style={{ borderColor: color + "40", color }}
    >
      {label}
    </div>
  );
}

function ValidationExample({
  severity,
  icon,
  title,
  description,
}: {
  severity: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  const colors: Record<string, string> = {
    critical: "border-red-500/30 bg-red-500/5",
    error: "border-orange-500/30 bg-orange-500/5",
    warning: "border-yellow-500/30 bg-yellow-500/5",
  };
  const textColors: Record<string, string> = {
    critical: "text-red-500",
    error: "text-orange-500",
    warning: "text-yellow-600",
  };

  return (
    <div className={`border rounded-lg p-4 ${colors[severity] || colors.info}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={textColors[severity] || "text-muted-foreground"}>
          {icon}
        </span>
        <span
          className={`text-xs font-medium uppercase ${textColors[severity]}`}
        >
          {severity}
        </span>
      </div>
      <h3 className="font-medium text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
