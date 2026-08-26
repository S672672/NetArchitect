import { NetworkProject, NetworkNode, NetworkEdge, VLAN, DeviceType } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { DEVICE_TYPES } from "@/lib/network/deviceTypes";

function createNode(
  type: DeviceType,
  name: string,
  config: {
    ipAddress?: string;
    subnet?: string;
    gateway?: string;
    vlan?: number;
  },
  position: { x: number; y: number }
): NetworkNode {
  const info = DEVICE_TYPES[type];
  const id = uuidv4();
  return {
    id,
    type: "network-device",
    position,
    data: {
      deviceType: type,
      label: name,
      config,
      category: info.category,
      icon: info.icon,
      color: info.color,
    },
  };
}

function createEdge(
  source: NetworkNode,
  target: NetworkNode,
  connectionType: "ethernet" | "fiber" | "wireless" | "vpn" | "internet" = "ethernet",
  label?: string
): NetworkEdge {
  return {
    id: uuidv4(),
    source: source.id,
    target: target.id,
    type: "default",
    data: {
      connectionType,
      status: "active",
      label,
    },
  };
}

export function createDemoProject(): NetworkProject {
  const internet = createNode("internet", "Internet", {}, { x: 400, y: 50 });
  const firewall = createNode("firewall", "Main Firewall", { ipAddress: "10.0.0.1", subnet: "10.0.0.0/24" }, { x: 400, y: 170 });
  const coreSwitch = createNode("l3-switch", "Core Switch", { ipAddress: "10.0.1.1", subnet: "10.0.1.0/24", vlan: 1 }, { x: 400, y: 300 });

  // Servers
  const appServer = createNode("application-server", "App Server", { ipAddress: "10.0.10.10", subnet: "10.0.10.0/24", gateway: "10.0.10.1", vlan: 10 }, { x: 150, y: 450 });
  const dbServer = createNode("database-server", "Database Server", { ipAddress: "10.0.10.20", subnet: "10.0.10.0/24", gateway: "10.0.10.1", vlan: 10 }, { x: 300, y: 450 });

  // Employee devices
  const accessSwitch = createNode("l2-switch", "Access Switch", { vlan: 20 }, { x: 500, y: 420 });
  const desktop = createNode("desktop", "Employee Desktop", { ipAddress: "10.0.20.10", subnet: "10.0.20.0/24", gateway: "10.0.20.1", vlan: 20 }, { x: 400, y: 560 });
  const laptop = createNode("laptop", "Employee Laptop", { ipAddress: "10.0.20.11", subnet: "10.0.20.0/24", gateway: "10.0.20.1", vlan: 20 }, { x: 550, y: 560 });

  // IoT
  const iotSensor = createNode("iot-device", "IoT Sensor", { ipAddress: "10.0.20.50", subnet: "10.0.20.0/24", gateway: "10.0.20.1", vlan: 20 }, { x: 700, y: 450 });

  // DEMO ISSUES: Isolated printer (no connections)
  const printer = createNode("printer", "Reception Printer", { vlan: 30 }, { x: 700, y: 300 });

  // DEMO ISSUE: Overlapping subnet with db server
  const backupServer = createNode("server", "Backup Server", { ipAddress: "10.0.10.30", subnet: "10.0.10.128/25", gateway: "10.0.10.1" }, { x: 150, y: 560 });

  // DNS Server
  const dnsServer = createNode("dns-server", "DNS Server", { ipAddress: "10.0.1.10", subnet: "10.0.1.0/24", gateway: "10.0.1.1", vlan: 1 }, { x: 200, y: 300 });

  const nodes = [internet, firewall, coreSwitch, appServer, dbServer, accessSwitch, desktop, laptop, iotSensor, printer, backupServer, dnsServer];

  const edges = [
    createEdge(internet, firewall, "internet"),
    createEdge(firewall, coreSwitch, "fiber"),
    createEdge(coreSwitch, appServer, "ethernet", "VLAN 10"),
    createEdge(coreSwitch, dbServer, "ethernet", "VLAN 10"),
    createEdge(coreSwitch, accessSwitch, "fiber"),
    createEdge(accessSwitch, desktop, "ethernet"),
    createEdge(accessSwitch, laptop, "wireless"),
    createEdge(accessSwitch, iotSensor, "ethernet"),
    createEdge(coreSwitch, dnsServer, "ethernet"),
    createEdge(coreSwitch, backupServer, "ethernet", "VLAN 10"),
  ];

  const vlans: VLAN[] = [
    { id: uuidv4(), vlanId: 1, name: "Management", subnet: "10.0.1.0/24", gateway: "10.0.1.1", deviceIds: [], description: "Core network management" },
    { id: uuidv4(), vlanId: 10, name: "Servers", subnet: "10.0.10.0/24", gateway: "10.0.10.1", deviceIds: [], description: "Server farm network" },
    { id: uuidv4(), vlanId: 20, name: "Employees", subnet: "10.0.20.0/24", gateway: "10.0.20.1", deviceIds: [], description: "Employee workstations" },
  ];

  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    name: "Enterprise Office Network",
    description: "Demo network with intentional validation issues",
    nodes,
    edges,
    vlans,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}
