import React from "react";
import {
  Clock,
  PhoneCall,
  CalendarCheck,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { LeadStatus } from "@roofing/shared-types";

interface LeadStatusBadgeProps {
  status: LeadStatus;
  size?: "sm" | "md";
}

export const statusDetails: Record<
  LeadStatus,
  {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
    bgClass: string;
    borderClass: string;
  }
> = {
  new: {
    label: "New",
    description: "Awaiting outreach",
    icon: Clock,
    colorClass: "text-amber-400",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/30",
  },
  contacted: {
    label: "Contacted",
    description: "Outreach completed",
    icon: PhoneCall,
    colorClass: "text-blue-400",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/30",
  },
  estimate_scheduled: {
    label: "Estimate Scheduled",
    description: "Inspection scheduled",
    icon: CalendarCheck,
    colorClass: "text-purple-400",
    bgClass: "bg-purple-500/10",
    borderClass: "border-purple-500/30",
  },
  won: {
    label: "Won",
    description: "Contract awarded",
    icon: CheckCircle2,
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/30",
  },
  lost: {
    label: "Lost",
    description: "Declined or canceled",
    icon: XCircle,
    colorClass: "text-slate-400",
    bgClass: "bg-slate-500/10",
    borderClass: "border-slate-500/30",
  },
};

export const LeadStatusBadge: React.FC<LeadStatusBadgeProps> = ({
  status,
  size = "md",
}) => {
  const config = statusDetails[status] || statusDetails.new;
  const Icon = config.icon;

  const isSmall = size === "sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.bgClass} ${config.colorClass} ${config.borderClass} ${
        isSmall ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-xs"
      }`}
      title={`Lead Status: ${config.label} — ${config.description}`}
      aria-label={`Status: ${config.label}`}
    >
      <Icon className={isSmall ? "w-3 h-3 shrink-0" : "w-3.5 h-3.5 shrink-0"} />
      <span className="font-semibold">{config.label}</span>
    </span>
  );
};
