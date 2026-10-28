import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Calendar,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  PhoneCall,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { fetchDashboardStats } from "../services/auth.service";
import type { DashboardStats, LeadStatus } from "@roofing/shared-types";

export const DashboardOverviewPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load dashboard statistics.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const statusConfigs: {
    key: LeadStatus;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
    bgClass: string;
    borderClass: string;
  }[] = [
    {
      key: "new",
      label: "New",
      description: "Awaiting initial phone or email outreach",
      icon: Clock,
      colorClass: "text-amber-400",
      bgClass: "bg-amber-500/10",
      borderClass: "border-amber-500/20",
    },
    {
      key: "contacted",
      label: "Contacted",
      description: "First outreach completed with homeowner",
      icon: PhoneCall,
      colorClass: "text-blue-400",
      bgClass: "bg-blue-500/10",
      borderClass: "border-blue-500/20",
    },
    {
      key: "estimate_scheduled",
      label: "Estimate Scheduled",
      description: "In-person roof inspection booked",
      icon: CalendarCheck,
      colorClass: "text-purple-400",
      bgClass: "bg-purple-500/10",
      borderClass: "border-purple-500/20",
    },
    {
      key: "won",
      label: "Won",
      description: "Job contract approved & awarded",
      icon: CheckCircle2,
      colorClass: "text-emerald-400",
      bgClass: "bg-emerald-500/10",
      borderClass: "border-emerald-500/20",
    },
    {
      key: "lost",
      label: "Lost",
      description: "Declined, canceled, or out-of-scope",
      icon: XCircle,
      colorClass: "text-slate-400",
      bgClass: "bg-slate-500/10",
      borderClass: "border-slate-500/20",
    },
  ];

  return (
    <div className="space-y-8" aria-busy={isLoading} data-testid="dashboard-overview">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Dashboard Overview
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Welcome back, <span className="text-amber-400 font-semibold">{user?.fullName || "Owner"}</span>. Real-time lead metrics from your roofing operations.
          </p>
        </div>

        <button
          type="button"
          onClick={loadStats}
          disabled={isLoading}
          aria-label="Refresh dashboard statistics"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-700 hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-50 self-start sm:self-auto focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-amber-400" : ""}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Error Banner with Retry */}
      {error && (
        <div
          className="p-4 rounded-2xl bg-red-950/40 border border-red-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-200"
          role="alert"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={loadStats}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-900 hover:bg-red-800 text-white self-start sm:self-auto transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inquiries */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Total Inquiries
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading ? (
              <div className="h-9 w-16 bg-slate-800 animate-pulse rounded-lg" />
            ) : (
              <div className="text-3xl font-extrabold text-white">
                {stats?.totalLeads ?? 0}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-400">All-time homeowner quote requests</p>
          </div>
        </div>

        {/* Recent Inquiries (30d) */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Last 30 Days
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading ? (
              <div className="h-9 w-16 bg-slate-800 animate-pulse rounded-lg" />
            ) : (
              <div className="text-3xl font-extrabold text-white">
                {stats?.last30Days ?? 0}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-400">Recent monthly inquiries</p>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Win Rate
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading ? (
              <div className="h-9 w-20 bg-slate-800 animate-pulse rounded-lg" />
            ) : (
              <div className="text-3xl font-extrabold text-white">
                {stats?.conversionRate ?? 0}%
              </div>
            )}
            <p className="mt-1 text-xs text-slate-400">Awarded jobs vs total inquiries</p>
          </div>
        </div>

        {/* Urgent Attention Count */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Needs Follow-Up
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading ? (
              <div className="h-9 w-12 bg-slate-800 animate-pulse rounded-lg" />
            ) : (
              <div className="text-3xl font-extrabold text-amber-400">
                {stats?.urgentAttentionCount ?? 0}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-400">New leads uncontacted &gt; 24h</p>
          </div>
        </div>
      </div>

      {/* Zero State Guidance */}
      {!isLoading && stats && stats.totalLeads === 0 && (
        <div className="p-8 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 text-center max-w-2xl mx-auto shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">
            No customer leads received yet
          </h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Your lead management system is active and connected to PostgreSQL. When prospective homeowners submit quote requests on your website or chat with your decision-tree chatbot, leads will instantly appear here with automated notifications.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/contact"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 transition-colors shadow-md"
            >
              <span>Test Public Quote Form</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Lead Status Pipeline Grid */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Lead Status Pipeline
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Breakdown of inquiries across the 5 standard business stages
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {statusConfigs.map((statusItem) => {
            const Icon = statusItem.icon;
            const count = stats?.statusCounts[statusItem.key] ?? 0;

            return (
              <div
                key={statusItem.key}
                className={`p-4 rounded-2xl border ${statusItem.borderClass} ${statusItem.bgClass} flex flex-col justify-between transition-transform hover:-translate-y-0.5`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-bold uppercase tracking-wider ${statusItem.colorClass}`}>
                      {statusItem.label}
                    </span>
                    <Icon className={`w-4 h-4 ${statusItem.colorClass}`} />
                  </div>
                  <div className="text-3xl font-extrabold text-white">
                    {isLoading ? "..." : count}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 leading-snug">
                  {statusItem.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
