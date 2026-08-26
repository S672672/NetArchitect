"use client";

import { useState } from "react";
import {
  Code2,
  FileText,
  Terminal,
  Copy,
  Check,
  Download,
  FileCode,
} from "lucide-react";
import { useTopologyStore } from "@/stores/topologyStore";
import {
  generateCiscoIOS,
  generateIptables,
  generateASCIITopology,
  generateMarkdownDocs,
} from "@/lib/config-export";

type ExportFormat = "cisco" | "iptables" | "ascii" | "markdown";

const FORMAT_INFO: Record<
  ExportFormat,
  { label: string; icon: React.ReactNode; description: string; ext: string }
> = {
  cisco: {
    label: "Cisco IOS",
    icon: <Terminal className="w-3.5 h-3.5" />,
    description: "Router/switch configuration commands",
    ext: "cfg",
  },
  iptables: {
    label: "iptables",
    icon: <Shield className="w-3.5 h-3.5" />,
    description: "Linux firewall rules for firewalls",
    ext: "sh",
  },
  ascii: {
    label: "ASCII Diagram",
    icon: <FileText className="w-3.5 h-3.5" />,
    description: "Text-based topology diagram",
    ext: "txt",
  },
  markdown: {
    label: "Markdown Docs",
    icon: <FileCode className="w-3.5 h-3.5" />,
    description: "Full network documentation",
    ext: "md",
  },
};

function Shield(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  );
}

export function ConfigExportPanel() {
  const { nodes, edges } = useTopologyStore();
  const [activeFormat, setActiveFormat] = useState<ExportFormat>("cisco");
  const [copied, setCopied] = useState(false);

  const getGeneratedConfig = (format: ExportFormat): string => {
    switch (format) {
      case "cisco":
        return generateCiscoIOS(nodes, edges);
      case "iptables":
        return generateIptables(nodes, edges);
      case "ascii":
        return generateASCIITopology(nodes, edges);
      case "markdown":
        return generateMarkdownDocs(nodes, edges);
    }
  };

  const config = getGeneratedConfig(activeFormat);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const info = FORMAT_INFO[activeFormat];
    const blob = new Blob([config], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `network-config.${info.ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (nodes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Code2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Add devices to generate configs</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Format Selector */}
      <div className="grid grid-cols-2 gap-1.5">
        {(Object.entries(FORMAT_INFO) as [ExportFormat, (typeof FORMAT_INFO)[ExportFormat]][]).map(
          ([key, info]) => (
            <button
              key={key}
              onClick={() => setActiveFormat(key)}
              className={`flex items-center gap-2 p-2 rounded text-xs text-left transition-colors ${
                activeFormat === key
                  ? "bg-foreground text-background"
                  : "bg-muted/50 hover:bg-muted"
              }`}
            >
              {info.icon}
              <span className="font-medium">{info.label}</span>
            </button>
          )
        )}
      </div>

      {/* Description */}
      <p className="text-[10px] text-muted-foreground">
        {FORMAT_INFO[activeFormat].description}
      </p>

      {/* Config Output */}
      <div className="relative">
        <pre className="bg-muted/50 rounded-lg p-3 text-[11px] font-mono overflow-auto max-h-96 overflow-y-auto border border-border leading-relaxed">
          {config || "No configuration generated."}
        </pre>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded hover:bg-muted transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-green-500" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 bg-foreground text-background rounded font-medium hover:opacity-90 transition-opacity"
        >
          <Download className="w-3 h-3" />
          Download .{FORMAT_INFO[activeFormat].ext}
        </button>
      </div>
    </div>
  );
}
