import { describe, it, expect } from "vitest";
import {
  isValidIPv4,
  ipToInt,
  intToIp,
  isValidCIDR,
  parseCIDR,
  prefixToSubnetMask,
  subnetMaskToPrefix,
  prefixToWildcardMask,
  getNetworkAddress,
  getBroadcastAddress,
  getFirstUsable,
  getLastUsable,
  getTotalAddresses,
  getUsableHosts,
  isIPInSubnet,
  doSubnetsOverlap,
  splitSubnet,
  ipToBinary,
} from "@/lib/network/ip";

describe("isValidIPv4", () => {
  it("accepts valid addresses", () => {
    expect(isValidIPv4("192.168.1.1")).toBe(true);
    expect(isValidIPv4("0.0.0.0")).toBe(true);
    expect(isValidIPv4("255.255.255.255")).toBe(true);
    expect(isValidIPv4("10.0.0.1")).toBe(true);
  });

  it("rejects invalid addresses", () => {
    expect(isValidIPv4("")).toBe(false);
    expect(isValidIPv4("256.0.0.0")).toBe(false);
    expect(isValidIPv4("192.168.1")).toBe(false);
    expect(isValidIPv4("192.168.1.1.1")).toBe(false);
    expect(isValidIPv4("abc.def.ghi.jkl")).toBe(false);
    expect(isValidIPv4("192.168.01.1")).toBe(false); // leading zero
  });
});

describe("ipToInt / intToIp", () => {
  it("converts correctly", () => {
    expect(ipToInt("0.0.0.0")).toBe(0);
    expect(ipToInt("0.0.0.1")).toBe(1);
    expect(ipToInt("255.255.255.255")).toBe(4294967295);
    expect(ipToInt("192.168.1.1")).toBe(3232235777);
  });

  it("roundtrips", () => {
    const ips = ["0.0.0.0", "1.2.3.4", "10.0.0.1", "192.168.1.1", "255.255.255.255"];
    for (const ip of ips) {
      expect(intToIp(ipToInt(ip))).toBe(ip);
    }
  });
});

describe("ipToBinary", () => {
  it("converts to binary representation", () => {
    expect(ipToBinary("192.168.1.1")).toBe("11000000.10101000.00000001.00000001");
    expect(ipToBinary("255.255.255.255")).toBe("11111111.11111111.11111111.11111111");
    expect(ipToBinary("0.0.0.0")).toBe("00000000.00000000.00000000.00000000");
  });
});

describe("isValidCIDR", () => {
  it("accepts valid CIDR", () => {
    expect(isValidCIDR("192.168.1.0/24")).toBe(true);
    expect(isValidCIDR("0.0.0.0/0")).toBe(true);
    expect(isValidCIDR("10.0.0.0/8")).toBe(true);
    expect(isValidCIDR("172.16.0.0/12")).toBe(true);
  });

  it("rejects invalid CIDR", () => {
    expect(isValidCIDR("")).toBe(false);
    expect(isValidCIDR("192.168.1.0")).toBe(false);
    expect(isValidCIDR("192.168.1.0/33")).toBe(false);
    expect(isValidCIDR("256.0.0.0/24")).toBe(false);
  });
});

describe("prefixToSubnetMask", () => {
  it("returns correct masks", () => {
    expect(prefixToSubnetMask(24)).toBe("255.255.255.0");
    expect(prefixToSubnetMask(16)).toBe("255.255.0.0");
    expect(prefixToSubnetMask(8)).toBe("255.0.0.0");
    expect(prefixToSubnetMask(0)).toBe("0.0.0.0");
    expect(prefixToSubnetMask(32)).toBe("255.255.255.255");
    expect(prefixToSubnetMask(25)).toBe("255.255.255.128");
  });
});

describe("subnetMaskToPrefix", () => {
  it("converts mask to prefix", () => {
    expect(subnetMaskToPrefix("255.255.255.0")).toBe(24);
    expect(subnetMaskToPrefix("255.255.0.0")).toBe(16);
    expect(subnetMaskToPrefix("255.0.0.0")).toBe(8);
    expect(subnetMaskToPrefix("0.0.0.0")).toBe(0);
  });

  it("returns null for invalid masks", () => {
    expect(subnetMaskToPrefix("255.0.255.0")).toBeNull();
    expect(subnetMaskToPrefix("invalid")).toBeNull();
  });
});

describe("getNetworkAddress", () => {
  it("calculates network address", () => {
    expect(getNetworkAddress("192.168.1.5", 24)).toBe("192.168.1.0");
    expect(getNetworkAddress("10.0.0.100", 8)).toBe("10.0.0.0");
    expect(getNetworkAddress("172.16.5.128", 25)).toBe("172.16.5.128");
  });
});

describe("getBroadcastAddress", () => {
  it("calculates broadcast address", () => {
    expect(getBroadcastAddress("192.168.1.5", 24)).toBe("192.168.1.255");
    expect(getBroadcastAddress("10.0.0.100", 8)).toBe("10.255.255.255");
  });
});

describe("getFirstUsable / getLastUsable", () => {
  it("calculates correct range for /24", () => {
    expect(getFirstUsable("192.168.1.0", 24)).toBe("192.168.1.1");
    expect(getLastUsable("192.168.1.0", 24)).toBe("192.168.1.254");
  });

  it("handles /31 correctly", () => {
    expect(getFirstUsable("192.168.1.0", 31)).toBe("192.168.1.0");
    expect(getLastUsable("192.168.1.0", 31)).toBe("192.168.1.1");
  });

  it("handles /32 correctly", () => {
    expect(getFirstUsable("192.168.1.1", 32)).toBe("192.168.1.1");
    expect(getLastUsable("192.168.1.1", 32)).toBe("192.168.1.1");
  });
});

describe("getTotalAddresses / getUsableHosts", () => {
  it("returns correct counts", () => {
    expect(getTotalAddresses(24)).toBe(256);
    expect(getUsableHosts(24)).toBe(254);
    expect(getTotalAddresses(16)).toBe(65536);
    expect(getUsableHosts(16)).toBe(65534);
    expect(getUsableHosts(32)).toBe(0);
    expect(getUsableHosts(31)).toBe(0);
  });
});

describe("isIPInSubnet", () => {
  it("checks membership", () => {
    expect(isIPInSubnet("192.168.1.5", "192.168.1.0", 24)).toBe(true);
    expect(isIPInSubnet("192.168.1.255", "192.168.1.0", 24)).toBe(true);
    expect(isIPInSubnet("192.168.2.1", "192.168.1.0", 24)).toBe(false);
  });
});

describe("doSubnetsOverlap", () => {
  it("detects overlap", () => {
    expect(doSubnetsOverlap("192.168.1.0", 24, "192.168.1.128", 25)).toBe(true);
    expect(doSubnetsOverlap("192.168.1.0", 24, "192.168.2.0", 24)).toBe(false);
    expect(doSubnetsOverlap("10.0.0.0", 8, "10.1.0.0", 16)).toBe(true);
  });
});

describe("splitSubnet", () => {
  it("splits /24 into 4 subnets", () => {
    const result = splitSubnet("192.168.1.0", 24, 4);
    expect(result.length).toBe(4);
    expect(result[0]).toEqual({ ip: "192.168.1.0", prefix: 26 });
    expect(result[1]).toEqual({ ip: "192.168.1.64", prefix: 26 });
    expect(result[2]).toEqual({ ip: "192.168.1.128", prefix: 26 });
    expect(result[3]).toEqual({ ip: "192.168.1.192", prefix: 26 });
  });

  it("returns empty for non-power-of-2", () => {
    expect(splitSubnet("192.168.1.0", 24, 3)).toEqual([]);
  });
});
