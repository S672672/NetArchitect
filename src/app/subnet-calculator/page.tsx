"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Network,
  ArrowLeft,
  Calculator,
  SplitSquareHorizontal,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
  isValidCIDR,
  parseCIDR,
  getNetworkAddress,
  getBroadcastAddress,
  getFirstUsable,
  getLastUsable,
  getTotalAddresses,
  getUsableHosts,
  prefixToSubnetMask,
  prefixToWildcardMask,
  ipToBinary,
  splitSubnet,
} from "@/lib/network/ip";
import { SubnetInfo, SubnetSplit } from "@/types";

export default function SubnetCalculatorPage() {
  const [input, setInput] = useState("192.168.1.0/24");
  const [result, setResult] = useState<SubnetInfo | null>(null);
  const [error, setError] = useState("");

  // Split subnet
  const [splitInput, setSplitInput] = useState("192.168.1.0/24");
  const [splitCount, setSplitCount] = useState(4);
  const [splitResult, setSplitResult] = useState<SubnetSplit | null>(null);
  const [splitError, setSplitError] = useState("");

  const handleCalculate = () => {
    if (!isValidCIDR(input)) {
      setError("Invalid CIDR notation. Use format: x.x.x.x/n");
      setResult(null);
      return;
    }

    setError("");
    const parsed = parseCIDR(input)!;
    const subnetMask = prefixToSubnetMask(parsed.prefix);

    setResult({
      networkAddress: getNetworkAddress(parsed.ip, parsed.prefix),
      broadcastAddress: getBroadcastAddress(parsed.ip, parsed.prefix),
      firstUsable: getFirstUsable(parsed.ip, parsed.prefix),
      lastUsable: getLastUsable(parsed.ip, parsed.prefix),
      totalAddresses: getTotalAddresses(parsed.prefix),
      usableHosts: getUsableHosts(parsed.prefix),
      subnetMask,
      wildcardMask: prefixToWildcardMask(parsed.prefix),
      cidr: parsed.prefix,
      binaryNetwork: ipToBinary(getNetworkAddress(parsed.ip, parsed.prefix)),
      binaryMask: ipToBinary(subnetMask),
    });
  };

  const handleSplit = () => {
    if (!isValidCIDR(splitInput)) {
      setSplitError("Invalid CIDR notation");
      setSplitResult(null);
      return;
    }

    const parsed = parseCIDR(splitInput)!;
    const subnets = splitSubnet(parsed.ip, parsed.prefix, splitCount);

    if (subnets.length === 0) {
      setSplitError("Cannot split: invalid parameters or not enough space");
      setSplitResult(null);
      return;
    }

    setSplitError("");
    const subnetMask = prefixToSubnetMask(parsed.prefix);

    setSplitResult({
      original: {
        networkAddress: getNetworkAddress(parsed.ip, parsed.prefix),
        broadcastAddress: getBroadcastAddress(parsed.ip, parsed.prefix),
        firstUsable: getFirstUsable(parsed.ip, parsed.prefix),
        lastUsable: getLastUsable(parsed.ip, parsed.prefix),
        totalAddresses: getTotalAddresses(parsed.prefix),
        usableHosts: getUsableHosts(parsed.prefix),
        subnetMask,
        wildcardMask: prefixToWildcardMask(parsed.prefix),
        cidr: parsed.prefix,
        binaryNetwork: ipToBinary(getNetworkAddress(parsed.ip, parsed.prefix)),
        binaryMask: ipToBinary(subnetMask),
      },
      subnets: subnets.map((s) => ({
        networkAddress: getNetworkAddress(s.ip, s.prefix),
        broadcastAddress: getBroadcastAddress(s.ip, s.prefix),
        firstUsable: getFirstUsable(s.ip, s.prefix),
        lastUsable: getLastUsable(s.ip, s.prefix),
        totalAddresses: getTotalAddresses(s.prefix),
        usableHosts: getUsableHosts(s.prefix),
        subnetMask: prefixToSubnetMask(s.prefix),
        wildcardMask: prefixToWildcardMask(s.prefix),
        cidr: s.prefix,
        binaryNetwork: ipToBinary(getNetworkAddress(s.ip, s.prefix)),
        binaryMask: ipToBinary(prefixToSubnetMask(s.prefix)),
      })),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link
            href="/projects"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <Network className="w-4 h-4" />
            <span className="font-semibold text-sm">NetVerge</span>
          </Link>
          <span className="text-sm text-muted-foreground">/ Subnet Calculator</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Calculator className="w-6 h-6" />
          <div>
            <h1 className="text-2xl font-bold">Subnet Calculator</h1>
            <p className="text-sm text-muted-foreground">
              Calculate IPv4 subnet details and split networks
            </p>
          </div>
        </div>

        {/* Calculator */}
        <section className="border border-border rounded-lg bg-card p-6 mb-8">
          <h2 className="font-semibold text-sm mb-4">Calculate Subnet</h2>
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCalculate()}
              placeholder="192.168.1.0/24"
              className="flex-1 px-3 py-2 text-sm font-mono border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={handleCalculate}
              className="px-4 py-2 text-sm font-medium bg-foreground text-background rounded-md hover:opacity-90 transition-opacity"
            >
              Calculate
            </button>
          </div>
          {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

          {result && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoField label="Network Address" value={result.networkAddress} mono />
              <InfoField label="Broadcast Address" value={result.broadcastAddress} mono />
              <InfoField label="First Usable" value={result.firstUsable} mono />
              <InfoField label="Last Usable" value={result.lastUsable} mono />
              <InfoField label="Total Addresses" value={String(result.totalAddresses)} />
              <InfoField label="Usable Hosts" value={String(result.usableHosts)} />
              <InfoField label="Subnet Mask" value={result.subnetMask} mono />
              <InfoField label="Wildcard Mask" value={result.wildcardMask} mono />
              <InfoField label="CIDR" value={`/${result.cidr}`} />

              <div className="col-span-full mt-2">
                <InfoField label="Binary Network" value={result.binaryNetwork} mono />
                <InfoField label="Binary Mask" value={result.binaryMask} mono />
              </div>
            </div>
          )}
        </section>

        {/* Subnet Splitting */}
        <section className="border border-border rounded-lg bg-card p-6">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <SplitSquareHorizontal className="w-4 h-4" />
            Subnet Splitting
          </h2>
          <div className="flex gap-3 mb-4 flex-wrap">
            <input
              type="text"
              value={splitInput}
              onChange={(e) => setSplitInput(e.target.value)}
              placeholder="192.168.1.0/24"
              className="flex-1 min-w-[200px] px-3 py-2 text-sm font-mono border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Split into</span>
              <select
                value={splitCount}
                onChange={(e) => setSplitCount(Number(e.target.value))}
                className="px-2 py-2 text-sm border border-border rounded-md bg-background focus:outline-none"
              >
                {[2, 4, 8, 16, 32, 64].map((n) => (
                  <option key={n} value={n}>
                    {n} subnets
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSplit}
              className="px-4 py-2 text-sm font-medium bg-foreground text-background rounded-md hover:opacity-90 transition-opacity"
            >
              Split
            </button>
          </div>
          {splitError && <p className="text-sm text-red-500 mb-2">{splitError}</p>}

          {splitResult && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Original: {splitResult.original.networkAddress}/{splitResult.original.cidr} →
                Split into {splitResult.subnets.length} subnets of /{splitResult.subnets[0]?.cidr}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 text-muted-foreground font-medium">#</th>
                      <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Network</th>
                      <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Range</th>
                      <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Broadcast</th>
                      <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Hosts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {splitResult.subnets.map((subnet, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 pr-4 font-mono">
                          {subnet.networkAddress}/{subnet.cidr}
                        </td>
                        <td className="py-2 pr-4 font-mono text-muted-foreground">
                          {subnet.firstUsable} – {subnet.lastUsable}
                        </td>
                        <td className="py-2 pr-4 font-mono text-muted-foreground">
                          {subnet.broadcastAddress}
                        </td>
                        <td className="py-2 pr-4">{subnet.usableHosts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function InfoField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="border border-border rounded-md p-2.5">
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
