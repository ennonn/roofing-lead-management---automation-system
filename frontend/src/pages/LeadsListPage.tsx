import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import {
  Search,
  X,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Inbox,
  ExternalLink,
} from "lucide-react";
import { fetchLeads, LeadApiError } from "../services/leads.service";
import { LeadStatusBadge } from "../components/leads/LeadStatusBadge";
import type {
  LeadListItem,
  LeadStatus,
  PaginationMetadata,
} from "@roofing/shared-types";

const ALL_STATUSES: { key: LeadStatus | "all"; label: string }[] = [
  { key: "all", label: "All Leads" },
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "estimate_scheduled", label: "Estimate Scheduled" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

const SORT_OPTIONS: {
  value: "submissionDate" | "createdAt" | "customerName" | "status" | "lastStatusUpdate";
  label: string;
}[] = [
  { value: "submissionDate", label: "Submission Date" },
  { value: "lastStatusUpdate", label: "Last Status Update" },
  { value: "customerName", label: "Customer Name" },
  { value: "status", label: "Status" },
  { value: "createdAt", label: "Created At" },
];

export const LeadsListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL state parameters
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const limitParam = parseInt(searchParams.get("limit") || "20", 10);
  const statusParam = (searchParams.get("status") || "all") as LeadStatus | "all";
  const searchParam = searchParams.get("search") || "";
  const sortByParam = (searchParams.get("sortBy") || "submissionDate") as
    | "submissionDate"
    | "createdAt"
    | "customerName"
    | "status"
    | "lastStatusUpdate";
  const sortOrderParam = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

  // Local state
  const [searchInput, setSearchInput] = useState<string>(searchParam);
  const [leads, setLeads] = useState<LeadListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    total: 0,
    page: pageParam || 1,
    limit: limitParam || 20,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active request tracking to eliminate race conditions / stale responses
  const activeRequestId = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Synchronize search input if URL changes externally
  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  // Load leads from backend
  const loadLeads = useCallback(async () => {
    const requestId = ++activeRequestId.current;

    // Abort preceding pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchLeads(
        {
          page: pageParam >= 1 ? pageParam : 1,
          limit: limitParam >= 1 && limitParam <= 100 ? limitParam : 20,
          status: statusParam === "all" ? undefined : statusParam,
          search: searchParam.trim() || undefined,
          sortBy: sortByParam,
          sortOrder: sortOrderParam,
        },
        controller.signal
      );

      // Only update state if this is still the most recent request
      if (requestId === activeRequestId.current) {
        setLeads(result.leads);
        setPagination(result.pagination);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return; // Ignore aborted requests
      }
      if (requestId === activeRequestId.current) {
        const message =
          err instanceof LeadApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : "Failed to load leads.";
        setError(message);
      }
    } finally {
      if (requestId === activeRequestId.current) {
        setIsLoading(false);
      }
    }
  }, [pageParam, limitParam, statusParam, searchParam, sortByParam, sortOrderParam]);

  useEffect(() => {
    loadLeads();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadLeads]);

  // Debounced search update
  useEffect(() => {
    const handler = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== searchParam) {
        const newParams = new URLSearchParams(searchParams);
        if (trimmed) {
          newParams.set("search", trimmed);
        } else {
          newParams.delete("search");
        }
        newParams.set("page", "1"); // Reset pagination on search change
        setSearchParams(newParams, { replace: true });
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [searchInput, searchParam, searchParams, setSearchParams]);

  // Handle status filter change
  const handleStatusChange = (status: LeadStatus | "all") => {
    const newParams = new URLSearchParams(searchParams);
    if (status === "all") {
      newParams.delete("status");
    } else {
      newParams.set("status", status);
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  // Handle sort column and order
  const handleSortChange = (
    field: "submissionDate" | "createdAt" | "customerName" | "status" | "lastStatusUpdate"
  ) => {
    const newParams = new URLSearchParams(searchParams);
    if (sortByParam === field) {
      // Toggle direction
      newParams.set("sortOrder", sortOrderParam === "asc" ? "desc" : "asc");
    } else {
      newParams.set("sortBy", field);
      newParams.set("sortOrder", "desc");
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", String(newPage));
    setSearchParams(newParams);
  };

  // Handle page limit change
  const handleLimitChange = (newLimit: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("limit", String(newLimit));
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchInput("");
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters = Boolean(searchParam || statusParam !== "all");

  const startRecord =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="space-y-6" aria-busy={isLoading} data-testid="leads-list-page">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Leads Management</span>
            {!isLoading && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {pagination.total} Total
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            View, track, and update all customer quote requests and follow-up notes.
          </p>
        </div>

        <button
          type="button"
          onClick={loadLeads}
          disabled={isLoading}
          aria-label="Refresh lead list"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-700 hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-50 self-start sm:self-auto focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by customer name, phone, email, or property..."
              aria-label="Search leads"
              className="w-full pl-10 pr-10 py-2 rounded-xl text-sm bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                aria-label="Clear search query"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selection & Order Controls */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={sortByParam}
                onChange={(e) =>
                  handleSortChange(
                    e.target.value as
                      | "submissionDate"
                      | "createdAt"
                      | "customerName"
                      | "status"
                      | "lastStatusUpdate"
                  )
                }
                aria-label="Sort leads by field"
                className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    Sort by: {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() =>
                handleSortChange(sortByParam)
              }
              aria-label={`Sort direction: currently ${
                sortOrderParam === "asc" ? "ascending" : "descending"
              }. Click to toggle.`}
              title={`Toggle sort order (${sortOrderParam.toUpperCase()})`}
              className="p-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
            >
              {sortOrderParam === "asc" ? (
                <ArrowUp className="w-4 h-4 text-amber-400" />
              ) : (
                <ArrowDown className="w-4 h-4 text-amber-400" />
              )}
            </button>
          </div>
        </div>

        {/* Status Filter Tabs / Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Status:</span>
          </span>
          {ALL_STATUSES.map((item) => {
            const isActive = statusParam === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleStatusChange(item.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  isActive
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "bg-slate-950/70 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
                aria-pressed={isActive}
              >
                {item.label}
              </button>
            );
          })}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="ml-auto text-xs text-amber-400 hover:text-amber-300 font-medium px-2 py-1 rounded hover:underline focus:outline-none focus:ring-2 focus:ring-amber-500 shrink-0"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Error Message Banner */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-800/60 bg-red-950/30 p-4 text-sm text-red-200 flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-300">Unable to load leads</p>
              <p className="text-xs text-red-300/90 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadLeads}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800 text-white border border-red-700/50 transition-colors shrink-0"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {isLoading && leads.length === 0 ? (
          /* Loading State Skeleton */
          <div className="p-8 space-y-4" data-testid="leads-loading-state">
            <div className="animate-pulse space-y-3">
              {[...Array(6)].map((_, idx) => (
                <div
                  key={idx}
                  className="h-16 bg-slate-800/60 rounded-xl w-full"
                />
              ))}
            </div>
            <p className="text-center text-xs text-slate-500 font-medium pt-2">
              Loading leads from server...
            </p>
          </div>
        ) : leads.length === 0 ? (
          /* Empty Results State */
          <div
            className="p-12 text-center space-y-3"
            data-testid="leads-empty-state"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Inbox className="w-6 h-6" />
            </div>
            {hasActiveFilters ? (
              <>
                <h3 className="text-base font-bold text-white">
                  No matching leads found
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No customer inquiries match your current search and filter settings. Try adjusting your query or resetting filters.
                </p>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="mt-2 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
                >
                  Clear All Filters
                </button>
              </>
            ) : (
              <>
                <h3 className="text-base font-bold text-white">No leads received yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  New homeowner quote requests from your public website form will automatically appear here.
                </p>
              </>
            )}
          </div>
        ) : (
          /* Data Results: Desktop Table + Mobile Cards */
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">
                      Customer
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Service & Location
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3.5 cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSortChange("submissionDate")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Submitted</span>
                        {sortByParam === "submissionDate" ? (
                          sortOrderParam === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </div>
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-center">
                      Notes
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {leads.map((lead) => {
                    const formattedDate = new Date(lead.submissionDate).toLocaleDateString(
                      undefined,
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    );

                    return (
                      <tr
                        key={lead.id}
                        className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                        onClick={() => navigate(`/dashboard/leads/${lead.id}`)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            navigate(`/dashboard/leads/${lead.id}`);
                          }
                        }}
                        aria-label={`View lead details for ${lead.customerName}`}
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-white group-hover:text-amber-400 transition-colors">
                            {lead.customerName}
                          </div>
                          <div className="flex flex-col gap-0.5 mt-1 text-xs text-slate-400">
                            {lead.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-500" />
                                {lead.phone}
                              </span>
                            )}
                            {lead.email && (
                              <span className="flex items-center gap-1 truncate max-w-[200px]" title={lead.email}>
                                <Mail className="w-3 h-3 text-slate-500" />
                                {lead.email}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-200">
                            {lead.serviceType}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-1 truncate max-w-[220px]" title={lead.propertyLocation}>
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{lead.propertyLocation}</span>
                          </div>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          <LeadStatusBadge status={lead.status} size="sm" />
                        </td>

                        <td className="px-4 py-4 text-xs text-slate-400 whitespace-nowrap">
                          {formattedDate}
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                              lead.notesCount > 0
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "text-slate-500"
                            }`}
                            title={`${lead.notesCount} follow-up note(s)`}
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>{lead.notesCount}</span>
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            to={`/dashboard/leads/${lead.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-amber-500 hover:text-slate-950 border border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            <span>Details</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-800">
              {leads.map((lead) => {
                const formattedDate = new Date(lead.submissionDate).toLocaleDateString(
                  undefined,
                  {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                );

                return (
                  <div
                    key={lead.id}
                    onClick={() => navigate(`/dashboard/leads/${lead.id}`)}
                    className="p-4 space-y-3 hover:bg-slate-800/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-white text-base">
                          {lead.customerName}
                        </h3>
                        <p className="text-xs text-amber-400 font-medium">
                          {lead.serviceType}
                        </p>
                      </div>
                      <LeadStatusBadge status={lead.status} size="sm" />
                    </div>

                    <div className="grid grid-cols-1 gap-1 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{lead.propertyLocation}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{lead.phone}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs text-slate-400">
                      <span>{formattedDate}</span>
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{lead.notesCount} notes</span>
                        </span>
                        <Link
                          to={`/dashboard/leads/${lead.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-amber-400 hover:text-amber-300 font-semibold"
                        >
                          View &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls Footer */}
            <div className="px-5 py-4 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-3">
                <span>
                  Showing <strong className="text-white">{startRecord}</strong> to{" "}
                  <strong className="text-white">{endRecord}</strong> of{" "}
                  <strong className="text-white">{pagination.total}</strong> results
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Per page:</span>
                  <select
                    value={pagination.limit}
                    onChange={(e) => handleLimitChange(Number(e.target.value))}
                    aria-label="Items per page"
                    className="px-2 py-1 rounded-md bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1 || isLoading}
                    aria-label="Previous page"
                    className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-2 font-medium text-slate-300">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages || isLoading}
                    aria-label="Next page"
                    className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
