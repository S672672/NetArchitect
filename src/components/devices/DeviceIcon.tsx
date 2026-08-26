"use client";

import {
  Router,
  Network,
  Shield,
  Wifi,
  Scale,
  Server,
  Database,
  Cpu,
  Globe,
  Monitor,
  Laptop,
  Smartphone,
  Radio,
  Printer,
  Cloud,
  Lock,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Router,
  Network,
  Shield,
  Wifi,
  Scale,
  Server,
  Database,
  Cpu,
  Globe,
  Monitor,
  Laptop,
  Smartphone,
  Radio,
  Printer,
  Cloud,
  Lock,
};

interface DeviceIconProps {
  icon: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function DeviceIcon({ icon, size = 20, className, style }: DeviceIconProps) {
  const IconComponent = ICON_MAP[icon];
  if (!IconComponent) {
    return (
      <span className={className} style={style}>
        <Globe size={size} />
      </span>
    );
  }
  return (
    <span className={className} style={style}>
      <IconComponent size={size} />
    </span>
  );
}
