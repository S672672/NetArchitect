import { NetworkProject, NetworkNode, NetworkEdge, VLAN, DeviceType } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { DEVICE_TYPES } from "@/lib/network/deviceTypes";

function createNode(
  type: DeviceType,
  name: string,
  config: { ipAddress?: string; subnet?: string; gateway?: string; vlan?: number; description?: string },
  position: { x: number; y: number }
): NetworkNode {
  const info = DEVICE_TYPES[type];
  return {
    id: uuidv4(),
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
  bandwidth?: string,
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
      bandwidth,
      label,
    },
  };
}

export function createDemoProject(): NetworkProject {
  // === Edge Layer ===
  const internet = createNode("internet", "Internet", {}, { x: 400, y: 0 });
  const edgeRouter = createNode("router", "Edge Router", {
    ipAddress: "203.0.113.1",
    subnet: "203.0.113.0/30",
    description: "BGP upstream connection",
  }, { x: 400, y: 120 });

  // === Security Layer ===
  const primaryFirewall = createNode("firewall", "Primary Firewall", {
    ipAddress: "10.0.0.1",
    subnet: "10.0.0.0/30",
    description: "Main perimeter firewall",
  }, { x: 400, y: 240 });

  // === Core Layer ===
  const coreSwitch1 = createNode("l3-switch", "Core Switch 1", {
    ipAddress: "10.0.1.1",
    subnet: "10.0.1.0/24",
    vlan: 1,
    description: "Primary core switch",
  }, { x: 300, y: 380 });

  // === Distribution / Access ===
  const coreSwitch2 = createNode("l3-switch", "Core Switch 2", {
    ipAddress: "10.0.1.2",
    subnet: "10.0.1.0/24",
    vlan: 1,
    description: "Secondary core — note: no connection to firewall (SPOF issue)",
  }, { x: 550, y: 380 });

  const serverSwitch = createNode("l2-switch", "Server Access Switch", {
    vlan: 10,
    description: "48-port switch for server farm",
  }, { x: 150, y: 520 });

  const employeeSwitch = createNode("l2-switch", "Employee Access Switch", {
    vlan: 20,
    description: "48-port switch for employees",
  }, { x: 500, y: 520 });

  // === Server Farm (VLAN 10) ===
  const appServer = createNode("application-server", "App Server 1", {
    ipAddress: "10.0.10.10",
    subnet: "10.0.10.0/24",
    gateway: "10.0.10.1",
    vlan: 10,
  }, { x: 50, y: 660 });

  const dbServer = createNode("database-server", "Database Server", {
    ipAddress: "10.0.10.20",
    subnet: "10.0.10.0/24",
    gateway: "10.0.10.1",
    vlan: 10,
    description: "Production PostgreSQL database",
  }, { x: 200, y: 660 });

  const dnsServer = createNode("dns-server", "Internal DNS", {
    ipAddress: "10.0.10.5",
    subnet: "10.0.10.0/24",
    gateway: "10.0.10.1",
    vlan: 10,
  }, { x: 350, y: 660 });

  const loadBalancer = createNode("load-balancer", "Load Balancer", {
    ipAddress: "10.0.10.100",
    subnet: "10.0.10.0/24",
    gateway: "10.0.10.1",
    vlan: 10,
  }, { x: 50, y: 540 });

  // === Employee Devices (VLAN 20) ===
  const desktop1 = createNode("desktop", "Employee Desktop 1", {
    ipAddress: "10.0.20.10",
    subnet: "10.0.20.0/24",
    gateway: "10.0.20.1",
    vlan: 20,
  }, { x: 420, y: 660 });

  const desktop2 = createNode("desktop", "Employee Desktop 2", {
    ipAddress: "10.0.20.11",
    subnet: "10.0.20.0/24",
    gateway: "10.0.20.1",
    vlan: 20,
  }, { x: 530, y: 660 });

  const laptop1 = createNode("laptop", "Employee Laptop", {
    ipAddress: "10.0.20.20",
    subnet: "10.0.20.0/24",
    gateway: "10.0.20.1",
    vlan: 20,
  }, { x: 640, y: 660 });

  const wirelessAp = createNode("wireless-ap", "Office WiFi", {
    ipAddress: "10.0.20.254",
    subnet: "10.0.20.0/24",
    gateway: "10.0.20.1",
    vlan: 20,
  }, { x: 500, y: 440 });

  // === IoT Devices (VLAN 20 — intentional: on employee VLAN) ===
  const iotThermostat = createNode("iot-device", "HVAC Thermostat", {
    ipAddress: "10.0.20.200",
    subnet: "10.0.20.0/24",
    gateway: "10.0.20.1",
    vlan: 20,
  }, { x: 700, y: 540 });

  const iotCamera = createNode("iot-device", "Security Camera", {
    ipAddress: "10.0.20.201",
    subnet: "10.0.20.0/24",
    gateway: "10.0.20.1",
    vlan: 20,
  }, { x: 750, y: 440 });

  // === Management (VLAN 99) ===
  const managementSwitch = createNode("l2-switch", "Management Switch", {
    vlan: 99,
    description: "Out-of-band management",
  }, { x: 150, y: 420 });

  const printer = createNode("printer", "Reception Printer", {
    vlan: 20,
    description: "Network printer",
  }, { x: 700, y: 660 });

  // === Guest Network (VLAN 50) ===
  const guestAP = createNode("wireless-ap", "Guest WiFi", {
    ipAddress: "10.0.50.1",
    subnet: "10.0.50.0/24",
    vlan: 50,
    description: "Guest network access point",
  }, { x: 600, y: 440 });

  const nodes = [
    internet, edgeRouter, primaryFirewall,
    coreSwitch1, coreSwitch2, serverSwitch, employeeSwitch,
    appServer, dbServer, dnsServer, loadBalancer,
    desktop1, desktop2, laptop1, wirelessAp,
    iotThermostat, iotCamera, managementSwitch, printer, guestAP,
  ];

  const edges = [
    // Edge
    createEdge(internet, edgeRouter, "internet", "1000", "BGP"),
    createEdge(edgeRouter, primaryFirewall, "fiber", "10000"),

    // Core — note: only Core Switch 1 connects to firewall (intentional SPOF)
    createEdge(primaryFirewall, coreSwitch1, "fiber", "10000"),
    createEdge(coreSwitch1, coreSwitch2, "fiber", "10000", "Core Interconnect"),

    // Server farm
    createEdge(coreSwitch1, serverSwitch, "fiber", "10000"),
    createEdge(serverSwitch, loadBalancer, "ethernet", "1000"),
    createEdge(serverSwitch, appServer, "ethernet", "1000"),
    createEdge(serverSwitch, dbServer, "ethernet", "1000"),
    createEdge(serverSwitch, dnsServer, "ethernet", "1000"),

    // Employees
    createEdge(coreSwitch1, employeeSwitch, "fiber", "10000"),
    createEdge(employeeSwitch, desktop1, "ethernet", "1000"),
    createEdge(employeeSwitch, desktop2, "ethernet", "1000"),
    createEdge(employeeSwitch, laptop1, "wireless", "300"),
    createEdge(employeeSwitch, wirelessAp, "ethernet", "1000"),
    createEdge(employeeSwitch, printer, "ethernet", "100"),

    // IoT — on employee switch (intentional: should be isolated)
    createEdge(employeeSwitch, iotThermostat, "ethernet", "100"),
    createEdge(employeeSwitch, iotCamera, "ethernet", "100"),

    // Guest
    createEdge(coreSwitch2, guestAP, "ethernet", "1000"),

    // Management
    createEdge(coreSwitch1, managementSwitch, "ethernet", "1000"),
  ];

  const vlans: VLAN[] = [
    {
      id: uuidv4(), vlanId: 1, name: "Management", subnet: "10.0.1.0/24",
      gateway: "10.0.1.1", deviceIds: [], description: "Core network management",
    },
    {
      id: uuidv4(), vlanId: 10, name: "Servers", subnet: "10.0.10.0/24",
      gateway: "10.0.10.1", deviceIds: [], description: "Server farm",
    },
    {
      id: uuidv4(), vlanId: 20, name: "Employees", subnet: "10.0.20.0/24",
      gateway: "10.0.20.1", deviceIds: [], description: "Employee workstations (includes IoT — intentional issue)",
    },
    {
      id: uuidv4(), vlanId: 50, name: "Guest", subnet: "10.0.50.0/24",
      gateway: "10.0.50.1", deviceIds: [], description: "Guest network",
    },
    {
      id: uuidv4(), vlanId: 99, name: "OOB Management", subnet: "10.0.99.0/24",
      deviceIds: [], description: "Out-of-band management",
    },
  ];

  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    name: "Enterprise Office Network",
    description: "Realistic enterprise network with intentional architecture issues for validation discovery",
    nodes,
    edges,
    vlans,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}
