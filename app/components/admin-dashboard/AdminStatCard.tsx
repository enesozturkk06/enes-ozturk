"use client";
import { type ReactNode } from "react";
import { StatCard } from "@/app/components/ui";

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  icon: ReactNode;
  color?: "violet" | "red" | "gold" | "green";
  pulse?: boolean;
  href?: string;
  onClick?: () => void;
}

const COLOR_HEX: Record<NonNullable<Props["color"]>, string> = {
  violet: "#A78BFA", red: "#F87171", gold: "#FBBF24", green: "#4ADE80",
};

export default function AdminStatCard({ label, value, sub, icon, color = "violet", pulse, href, onClick }: Props) {
  return (
    <StatCard
      label={label} value={value} sub={sub} icon={icon}
      color={COLOR_HEX[color]} pulse={pulse} href={href} onClick={onClick}
    />
  );
}
