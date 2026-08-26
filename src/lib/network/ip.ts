/**
 * IP address and CIDR utilities for network calculations
 */

// ============================================================
// IPv4 Validation & Parsing
// ============================================================

export function isValidIPv4(ip: string): boolean {
  if (!ip || typeof ip !== "string") return false;
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (part === "") return false;
    if (!/^\d+$/.test(part)) return false;
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255 && String(num) === part;
  });
}

export function ipToInt(ip: string): number {
  if (!isValidIPv4(ip)) return -1;
  const parts = ip.split(".").map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

export function intToIp(int: number): string {
  return [
    (int >>> 24) & 0xff,
    (int >>> 16) & 0xff,
    (int >>> 8) & 0xff,
    int & 0xff,
  ].join(".");
}

export function ipToBinary(ip: string): string {
  if (!isValidIPv4(ip)) return "";
  return ip
    .split(".")
    .map((octet) => parseInt(octet, 10).toString(2).padStart(8, "0"))
    .join(".");
}

// ============================================================
// CIDR & Subnet Mask
// ============================================================

export function isValidCIDR(cidr: string): boolean {
  if (!cidr || typeof cidr !== "string") return false;
  const match = cidr.trim().match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/);
  if (!match) return false;
  if (!isValidIPv4(match[1])) return false;
  const prefix = parseInt(match[2], 10);
  return prefix >= 0 && prefix <= 32;
}

export function parseCIDR(cidr: string): { ip: string; prefix: number } | null {
  const match = cidr.trim().match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/);
  if (!match) return null;
  return { ip: match[1], prefix: parseInt(match[2], 10) };
}

export function prefixToSubnetMask(prefix: number): string {
  if (prefix < 0 || prefix > 32) return "0.0.0.0";
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return intToIp(mask);
}

export function subnetMaskToPrefix(mask: string): number | null {
  if (!isValidIPv4(mask)) return null;
  const int = ipToInt(mask);
  if (int === 0) return 0;
  // Check if mask is valid (continuous 1s followed by continuous 0s)
  const inverted = (~int) >>> 0;
  if (inverted === 0) return 32;
  // Check for trailing 0s pattern
  const shifted = (inverted + 1) >>> 0;
  if ((shifted & inverted) !== 0) return null;
  return 32 - Math.log2(shifted);
}

export function prefixToWildcardMask(prefix: number): string {
  const subnetInt = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return intToIp((~subnetInt) >>> 0);
}

// ============================================================
// Network Calculations
// ============================================================

export function getNetworkAddress(ip: string, prefix: number): string {
  const ipInt = ipToInt(ip);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return intToIp((ipInt & mask) >>> 0);
}

export function getBroadcastAddress(ip: string, prefix: number): string {
  const ipInt = ipToInt(ip);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return intToIp((ipInt | (~mask >>> 0)) >>> 0);
}

export function getFirstUsable(ip: string, prefix: number): string {
  if (prefix >= 31) return prefix === 32 ? ip : getNetworkAddress(ip, prefix);
  const networkInt = ipToInt(getNetworkAddress(ip, prefix));
  return intToIp((networkInt + 1) >>> 0);
}

export function getLastUsable(ip: string, prefix: number): string {
  if (prefix >= 31) return prefix === 32 ? ip : getBroadcastAddress(ip, prefix);
  const broadcastInt = ipToInt(getBroadcastAddress(ip, prefix));
  return intToIp((broadcastInt - 1) >>> 0);
}

export function getTotalAddresses(prefix: number): number {
  return Math.pow(2, 32 - prefix);
}

export function getUsableHosts(prefix: number): number {
  const total = getTotalAddresses(prefix);
  return Math.max(0, total - 2);
}

export function isIPInSubnet(ip: string, networkIp: string, prefix: number): boolean {
  const ipInt = ipToInt(ip);
  const networkInt = ipToInt(networkIp);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipInt & mask) >>> 0 === (networkInt & mask) >>> 0;
}

export function doSubnetsOverlap(
  net1Ip: string,
  net1Prefix: number,
  net2Ip: string,
  net2Prefix: number
): boolean {
  const net1Start = ipToInt(getNetworkAddress(net1Ip, net1Prefix));
  const net1End = ipToInt(getBroadcastAddress(net1Ip, net1Prefix));
  const net2Start = ipToInt(getNetworkAddress(net2Ip, net2Prefix));
  const net2End = ipToInt(getBroadcastAddress(net2Ip, net2Prefix));
  return net1Start <= net2End && net2Start <= net1End;
}

// ============================================================
// Subnet Splitting
// ============================================================

export function splitSubnet(
  ip: string,
  prefix: number,
  splitCount: number
): { ip: string; prefix: number }[] {
  // splitCount must be a power of 2
  const log2 = Math.log2(splitCount);
  if (!Number.isInteger(log2) || splitCount < 2) return [];

  const newPrefix = prefix + log2;
  if (newPrefix > 30) return [];

  const results: { ip: string; prefix: number }[] = [];
  const networkInt = ipToInt(getNetworkAddress(ip, prefix));

  for (let i = 0; i < splitCount; i++) {
    const subnetInt = (networkInt + i * Math.pow(2, 32 - newPrefix)) >>> 0;
    results.push({ ip: intToIp(subnetInt), prefix: newPrefix });
  }

  return results;
}
