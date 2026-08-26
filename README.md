# NetArchitect

**A browser-based Network Infrastructure Planning, Analysis, and Resilience Platform.**

Design network topologies visually, analyze architecture resilience, simulate failures, compare alternatives, and generate configurations — entirely in your browser with no backend required.

---

## What is NetArchitect?

NetArchitect is a local-first network infrastructure decision-support tool. It goes beyond diagramming — it actively analyzes your network topology using graph algorithms, detects architectural weaknesses, simulates failure scenarios, and helps you compare design alternatives.

### Primary Product Loop

```
DESIGN → ANALYZE → IDENTIFY RISKS → SIMULATE → IMPROVE → COMPARE → FINALIZE
```

---

## Core Features

### Visual Network Design
- Drag-and-drop canvas with 18 device types across 4 categories
- Connect devices with typed links (Ethernet, Fiber, Wireless, VPN, Internet)
- Configure IP addresses, subnets, VLANs, and gateways
- Auto-save to IndexedDB with debounced persistence
- Undo/redo with 50-entry history

### Graph-Based Analysis
- BFS/DFS traversal for reachability analysis
- Articulation point detection for single points of failure
- Connected component analysis
- Shortest path and alternate path detection

### 9 Validation Rules
1. Isolated devices
2. Single points of failure
3. Subnet overlap
4. Invalid IP configuration
5. Missing gateway
6. Public database exposure
7. Missing VLAN segmentation
8. Excessive connections
9. Redundant path analysis

### Network Health & Resilience Scoring
Deterministic scoring across 6 categories:
- Security, Connectivity, Redundancy, Configuration, Segmentation, Capacity
- Separate resilience score with failure tolerance analysis
- Every score includes explained deductions and improvements

### Failure Simulation
- Simulate device or connection failures without modifying the original topology
- Calculate reachability, affected services, and impact classification
- Business impact levels: LOW, MEDIUM, HIGH, CRITICAL
- Contextual recommendations for each failure scenario

### Architecture Scenarios & Comparison
- Create independent snapshots of your topology
- Compare any scenario against the current design
- Structural diff: added/removed/modified nodes, edges, VLANs
- Score comparison across all dimensions

### Security Exposure Analysis
- Detect Internet → sensitive infrastructure exposure paths
- Check for missing firewall boundaries
- Identify flat network segmentation issues
- IoT device isolation analysis
- Overall risk assessment

### Capacity Planning
- Growth projections with configurable user count and growth rate
- Subnet utilization analysis per VLAN
- Switch port capacity monitoring
- Subnet exhaustion prediction with upgrade recommendations

### Traffic & Bottleneck Analysis
- Define expected traffic between any source/destination
- Path analysis with per-segment bandwidth utilization
- Bottleneck detection with severity classification
- Connection type awareness (Ethernet, Fiber, Wireless, VPN)

### Architecture Versioning
- Create versioned snapshots of your topology
- Compare any two versions with structural diff
- Restore any previous version
- Version numbering (v1.0, v1.1, v2.0)

### Configuration Generation
- **Cisco IOS**: hostname, interfaces, IP addresses, VLANs, ACLs, NAT
- **iptables**: FORWARD chains, MASQUERADE, per-device security policies
- **ASCII Diagram**: Tree-style topology for READMEs
- **Markdown Docs**: Full network documentation with tables

### Network Cost Estimator
- Equipment costs based on device types (enterprise pricing)
- Cabling costs per connection type
- Monthly/annual recurring costs
- Cost optimization recommendations

### Additional Tools
- Subnet Calculator with full IPv4 CIDR math and subnet splitting
- VLAN Planner with device assignment and overlap detection
- Command Palette (Ctrl+K) with fuzzy search
- Multi-tab live sync via BroadcastChannel API
- Interactive onboarding tour
- Dark/light/system theme support
- PNG/SVG/JSON export and import

---

## Architecture

```
React / Next.js 16
       ↓
Zustand (5 stores: topology, project, UI, settings)
       ↓
Domain Logic (analysis engines)
       ↓
Graph Analysis (BFS, DFS, articulation points, connected components)
       ↓
Validation Engine (9 modular rules)
       ↓
IndexedDB (Dexie) — local-first persistence
```

### Project Structure

```
src/
├── app/                     # Next.js pages (routing)
│   ├── page.tsx             # Landing page
│   ├── projects/            # Project dashboard
│   ├── designer/[id]/       # Network designer
│   ├── subnet-calculator/   # Subnet calculator
│   └── vlan-planner/        # VLAN planner
├── components/
│   ├── canvas/              # React Flow canvas, packet flow
│   ├── devices/             # Device library, properties, config export
│   ├── analysis/            # Failure simulation, security, capacity, scenarios, versions
│   ├── validation/          # Validation panel, health score
│   ├── layout/              # Designer layout
│   └── ui/                  # Theme, command palette, onboarding
├── lib/
│   ├── analysis/            # All analysis engines
│   │   ├── failureSimulation.ts
│   │   ├── healthScoring.ts
│   │   ├── securityAnalysis.ts
│   │   ├── capacityPlanning.ts
│   │   ├── trafficAnalysis.ts
│   │   └── recommendations.ts
│   ├── graph/               # Graph algorithms (BFS, articulation points, etc.)
│   ├── validation/          # 9 validation rules
│   ├── network/             # Device type definitions
│   ├── subnet/              # CIDR math
│   ├── config-export/       # Cisco IOS, iptables generation
│   ├── cost-estimator/      # Equipment cost calculation
│   ├── scenarios/           # Architecture comparison
│   ├── versioning/          # Version management
│   ├── storage/             # IndexedDB/Dexie
│   └── sync/                # BroadcastChannel multi-tab sync
├── stores/                  # Zustand state management
├── types/                   # TypeScript type definitions
└── __tests__/               # Vitest test suite
```

---

## Why Local-First?

NetArchitect is designed to work entirely in the browser for several reasons:

1. **Privacy**: Network infrastructure designs may contain sensitive information about an organization's network. Local-first means this data never leaves the user's machine.

2. **Zero Setup**: No server, no database, no authentication. Open the URL and start working.

3. **Offline Capability**: Works without an internet connection after initial load.

4. **Speed**: No network latency for analysis operations. Graph algorithms run locally with zero latency.

5. **Deployment**: Can be deployed to any static hosting (Vercel, Netlify, Cloudflare Pages).

---

## Graph Algorithms Used

| Algorithm | Purpose |
|-----------|---------|
| **BFS** | Reachability analysis, shortest path, connected components |
| **DFS** | All-paths enumeration for traffic analysis |
| **Articulation Point Detection** | Single point of failure identification (Tarjan's algorithm) |
| **Connected Components** | Network segmentation analysis |
| **Graph Construction** | Adjacency list from node/edge data |

---

## Limitations

This honesty is important for understanding the tool's scope:

- **Topology analysis is not packet simulation.** Path and bandwidth analysis is based on the network topology graph, not actual packet-level networking. Traffic flow analysis shows expected paths based on device connections, not real-time packet behavior.

- **Generated configurations are templates, not guaranteed hardware-ready configs.** Cisco IOS and iptables configurations are generated based on the topology structure. They follow real syntax patterns but should be reviewed and adapted before deployment to actual hardware.

- **Security analysis is architecture-level, not penetration testing.** The security engine detects potentially unsafe topology patterns (like databases exposed to the internet). It does not perform vulnerability scanning, port scanning, or any form of active security testing.

- **Cost estimates are approximate.** Equipment costs use mid-range enterprise pricing as defaults. Actual costs vary by vendor, region, volume, and contract terms.

- **Local persistence is browser-specific.** IndexedDB data is tied to the browser and device. Export/Import provides portability between browsers and devices.

- **Capacity planning uses simplified models.** Growth projections are mathematical projections based on provided growth rates. Real-world capacity planning involves many additional factors.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 16 | React framework with App Router |
| TypeScript | Type safety (strict mode) |
| React Flow (@xyflow/react) | Node-based visual canvas |
| Zustand | State management (5 stores) |
| Dexie | IndexedDB wrapper |
| Tailwind CSS v4 | Styling with dark/light themes |
| Vitest | Test framework (65 tests) |
| html-to-image | PNG/SVG export |
| BroadcastChannel API | Multi-tab live sync |

---

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

---

## Testing

Tests cover critical business logic:

- **IP/Subnet calculations**: CIDR math, subnet splitting, overlap detection
- **Graph algorithms**: BFS, articulation points, connected components, path finding
- **Validation rules**: All 9 rules with edge cases
- **Failure simulation**: Node/edge failures, impact classification, reachability
- **Scoring**: Deterministic scoring with deductions, resilience calculation
- **Security analysis**: Exposure detection, firewall boundary checking
- **Capacity planning**: Growth projections, subnet utilization
- **Traffic analysis**: Path detection, bottleneck identification

```bash
npx vitest run
```

---

## License

MIT
