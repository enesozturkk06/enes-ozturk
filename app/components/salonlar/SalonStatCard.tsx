"use client";
import { type ReactNode } from "react";
import { StatCard } from "@/app/components/ui";

interface Props {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  sub?: string;
  icon: ReactNode;
  color?: string;
}

export default function SalonStatCard({ label, value, prefix, suffix, sub, icon, color = "#A78BFA" }: Props) {
  return (
    <StatCard
      label={label} value={value} prefix={prefix} suffix={suffix} countUp
      sub={sub} icon={icon} color={color}
    />
  );
}
