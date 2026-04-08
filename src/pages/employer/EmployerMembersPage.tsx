import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { TokenManager } from "@/api/auth/tokenManager";
import {
  extractBreneoUserIdFromEmployerProfileRaw,
  extractBreneoUserIdFromJwt,
} from "@/api/employer/profile";
import {
  fetchEmployerAggregatorCompanies,
  fetchEmployerStaffMemberships,
  parseAggregatorCompanyPk,
  type AggregatorCompany,
  type AggregatorStaffMembership,
} from "@/api/employer/aggregatorBffApi";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users } from "lucide-react";
import { toast } from "sonner";

function readStr(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function formatDate(v: unknown): string {
  const s = readStr(v);
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

export default function EmployerMembersPage() {
  const { user, loading: authLoading } = useAuth();
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [companies, setCompanies] = useState<AggregatorCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [memberships, setMemberships] = useState<AggregatorStaffMembership[]>([]);
  const [breneoUserId, setBreneoUserId] = useState("");

  const resolveBreneoUserId = useCallback(async (): Promise<string> => {
    const token = TokenManager.getAccessToken();
    try {
      const prof = await apiClient.get(API_ENDPOINTS.EMPLOYER.PROFILE);
      const fromProf = extractBreneoUserIdFromEmployerProfileRaw(prof.data);
      if (fromProf?.trim()) return fromProf.trim();
    } catch {
      /* fallback */
    }
    if (token) {
      const fromJwt = extractBreneoUserIdFromJwt(token);
      if (fromJwt?.trim()) return fromJwt.trim();
    }
    if (user?.id != null && String(user.id).trim() !== "") return String(user.id).trim();
    return "";
  }, [user?.id]);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      setLoadingCompanies(true);
      try {
        const uid = await resolveBreneoUserId();
        if (cancelled) return;
        setBreneoUserId(uid);
        if (!uid) {
          setCompanies([]);
          setSelectedCompanyId(null);
          return;
        }
        const list = await fetchEmployerAggregatorCompanies(uid);
        if (cancelled) return;
        setCompanies(list);
        const firstPk = list.map((c) => parseAggregatorCompanyPk(c.id)).find((x) => x != null) ?? null;
        setSelectedCompanyId(firstPk);
      } catch (e) {
        if (!cancelled) {
          setCompanies([]);
          setSelectedCompanyId(null);
          toast.error(
            e instanceof Error ? e.message : "Could not load your companies.",
          );
        }
      } finally {
        if (!cancelled) setLoadingCompanies(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, resolveBreneoUserId]);

  useEffect(() => {
    if (selectedCompanyId == null) {
      setMemberships([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingMembers(true);
      try {
        const rows = await fetchEmployerStaffMemberships({
          companyId: selectedCompanyId,
        });
        if (cancelled) return;
        setMemberships(rows);
      } catch (e) {
        if (!cancelled) {
          setMemberships([]);
          toast.error(
            e instanceof Error ? e.message : "Could not load company members.",
          );
        }
      } finally {
        if (!cancelled) setLoadingMembers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCompanyId]);

  const selectedCompanyName = useMemo(() => {
    if (selectedCompanyId == null) return "";
    const row = companies.find((c) => parseAggregatorCompanyPk(c.id) === selectedCompanyId);
    return readStr(row?.name) || `Company ${selectedCompanyId}`;
  }, [companies, selectedCompanyId]);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pt-2 pb-24 md:pb-8 px-2 sm:px-6 lg:px-8 space-y-4">
        <Card className="border-0 rounded-3xl">
          <CardHeader className="p-4 pb-2 border-b-0">
            <div className="flex items-start gap-3">
              <Users className="h-6 w-6 text-breneo-blue shrink-0 mt-0.5" />
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Company members
                </h1>
                <p className="text-sm text-muted-foreground font-normal mt-1">
                  Members are read from staff memberships for the selected company.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-4">
            {loadingCompanies ? (
              <p className="text-sm text-muted-foreground">Loading companies…</p>
            ) : companies.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No linked company found for this account.
              </p>
            ) : (
              <div className="space-y-2">
                <Label>Company</Label>
                <Select
                  value={selectedCompanyId != null ? String(selectedCompanyId) : ""}
                  onValueChange={(v) => {
                    const n = Number(v);
                    if (Number.isInteger(n) && n > 0) setSelectedCompanyId(n);
                  }}
                  disabled={loadingCompanies || loadingMembers}
                >
                  <SelectTrigger className="h-[3rem]">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies
                      .filter((c) => parseAggregatorCompanyPk(c.id) != null)
                      .map((c) => {
                        const id = parseAggregatorCompanyPk(c.id)!;
                        const label = readStr(c.name) || `Company ${id}`;
                        return (
                          <SelectItem key={id} value={String(id)}>
                            {label}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedCompanyId != null ? (
              <p className="text-xs text-muted-foreground">
                Showing memberships for <span className="font-medium text-foreground">{selectedCompanyName}</span>{" "}
                (company_id <span className="font-mono">{selectedCompanyId}</span>)
                {breneoUserId ? (
                  <>
                    {" "}· current user_id <span className="font-mono">{breneoUserId}</span>
                  </>
                ) : null}
              </p>
            ) : null}

            {loadingMembers ? (
              <p className="text-sm text-muted-foreground">Loading members…</p>
            ) : selectedCompanyId != null && memberships.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No staff memberships found for this company.
              </p>
            ) : (
              <div className="space-y-2">
                {memberships.map((m) => (
                  <div
                    key={`${m.id}-${m.external_user_id}`}
                    className="rounded-xl border border-border/60 p-3 bg-muted/20"
                  >
                    <p className="text-sm">
                      <span className="text-muted-foreground">User id:</span>{" "}
                      <span className="font-mono">{m.external_user_id}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      membership_id {m.id} · created {formatDate(m.created_at)} · updated{" "}
                      {formatDate(m.updated_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

