import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import { TokenManager } from "@/api/auth/tokenManager";
import {
  approveEmployerStaffMembership,
  countAdmins,
  deleteEmployerStaffMembership,
  fetchEmployerCompanyStaff,
  isCurrentUserAdmin,
  isStaffMembershipPending,
  patchEmployerStaffMembershipAdmin,
  resolveEmployerLinkedCompany,
  staffDisplayName,
  staffFirstName,
  staffSurname,
  staffEmail,
  staffMembershipStatus,
  type CompanyStaffMembership,
} from "@/api/employer/aggregatorBffApi";
import { resolveEmployerStaffUserId } from "@/api/employer/profile";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createEmployerMemberInvite } from "@/api/employer/memberInvitesApi";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoreVertical, UserPlus } from "lucide-react";
import { toast } from "sonner";

function statusBadgeLabel(m: CompanyStaffMembership): string {
  const s = staffMembershipStatus(m);
  if (s === "pending") return "Pending";
  if (s === "admin") return "Admin";
  return "Member";
}

export default function EmployerMembersPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [memberships, setMemberships] = useState<CompanyStaffMembership[]>([]);
  const [breneoUserId, setBreneoUserId] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSending, setInviteSending] = useState(false);

  const resolveBreneoUserId = useCallback(async (): Promise<string> => {
    const token = TokenManager.getAccessToken();
    try {
      const prof = await apiClient.get(API_ENDPOINTS.EMPLOYER.PROFILE);
      return resolveEmployerStaffUserId({
        accessToken: token,
        employerProfileRaw: prof.data,
        authUserId: user?.id,
      });
    } catch {
      return resolveEmployerStaffUserId({
        accessToken: token,
        authUserId: user?.id,
      });
    }
  }, [user?.id]);

  const reloadTeam = useCallback(async (cid: number) => {
    const rows = await fetchEmployerCompanyStaff(cid);
    setMemberships(rows);
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setMemberships([]);
      setCompanyId(null);
      try {
        const uid = await resolveBreneoUserId();
        if (cancelled) return;
        setBreneoUserId(uid);
        if (!uid) return;

        let profRaw: unknown;
        try {
          const prof = await apiClient.get(API_ENDPOINTS.EMPLOYER.PROFILE);
          profRaw = prof.data;
        } catch {
          profRaw = undefined;
        }

        const linked = await resolveEmployerLinkedCompany({
          breneoUserId: uid,
          employerProfileRaw: profRaw,
        });
        if (cancelled) return;
        if (!linked) return;

        setCompanyId(linked.companyId);
        setCompanyName(linked.companyName);
        const rows = await fetchEmployerCompanyStaff(linked.companyId);
        if (cancelled) return;
        setMemberships(rows);
      } catch (e) {
        if (!cancelled) {
          setMemberships([]);
          setCompanyId(null);
          toast.error(
            e instanceof Error ? e.message : "Could not load company team.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, resolveBreneoUserId]);

  const pendingMembers = useMemo(
    () => memberships.filter(isStaffMembershipPending),
    [memberships],
  );

  const activeMembers = useMemo(
    () => memberships.filter((m) => !isStaffMembershipPending(m)),
    [memberships],
  );

  const currentUserIsAdmin = useMemo(
    () =>
      breneoUserId ? isCurrentUserAdmin(memberships, breneoUserId) : false,
    [memberships, breneoUserId],
  );

  const adminCount = useMemo(() => countAdmins(memberships), [memberships]);

  const handleAcceptPending = async (member: CompanyStaffMembership) => {
    if (!currentUserIsAdmin) return;
    setActionId(member.id);
    try {
      await approveEmployerStaffMembership(member.id);
      toast.success(`${staffDisplayName(member)} was added to your company.`);
      if (companyId != null) await reloadTeam(companyId);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not approve team member.",
      );
    } finally {
      setActionId(null);
    }
  };

  const handleToggleAdmin = async (
    member: CompanyStaffMembership,
    nextAdmin: boolean,
  ) => {
    if (!currentUserIsAdmin) return;
    const isSelf = member.external_user_id === breneoUserId;
    if (isSelf && !nextAdmin && adminCount <= 1) {
      toast.error("Cannot demote the only admin for this company.");
      return;
    }
    setActionId(member.id);
    try {
      const updated = await patchEmployerStaffMembershipAdmin(
        member.id,
        nextAdmin,
      );
      setMemberships((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)),
      );
      toast.success(
        nextAdmin ? "Member is now an admin." : "Admin role removed.",
      );
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not update admin status.",
      );
    } finally {
      setActionId(null);
    }
  };

  const handleRemove = async (member: CompanyStaffMembership) => {
    if (!currentUserIsAdmin) return;
    if (member.external_user_id === breneoUserId) return;
    setActionId(member.id);
    try {
      await deleteEmployerStaffMembership(member.id);
      setMemberships((prev) => prev.filter((m) => m.id !== member.id));
      toast.success("Team member removed.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not remove team member.",
      );
    } finally {
      setActionId(null);
    }
  };

  const canToggleAdminOnRow = (member: CompanyStaffMembership): boolean => {
    if (!currentUserIsAdmin) return false;
    const isSelf = member.external_user_id === breneoUserId;
    if (!isSelf) return true;
    return adminCount > 1;
  };

  const handleSendInvite = async () => {
    if (companyId == null) return;
    const email = inviteEmail.trim();
    if (!email) {
      toast.error("Enter the employer's work email.");
      return;
    }
    setInviteSending(true);
    try {
      await createEmployerMemberInvite({
        companyId,
        companyName: companyName || `Company ${companyId}`,
        email,
      });
      toast.success("Invite email sent.");
      setInviteOpen(false);
      setInviteEmail("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send invite.");
    } finally {
      setInviteSending(false);
    }
  };

  const renderMemberRow = (m: CompanyStaffMembership, pending: boolean) => {
    const isSelf = m.external_user_id === breneoUserId;
    const busy = actionId === m.id;
    const status = staffMembershipStatus(m);
    const canPromote =
      !pending && currentUserIsAdmin && status === "member" && !isSelf;
    const canDemote =
      !pending &&
      currentUserIsAdmin &&
      status === "admin" &&
      canToggleAdminOnRow(m);
    const canRemove = currentUserIsAdmin && !isSelf;
    const showMenu =
      currentUserIsAdmin && (pending || canPromote || canDemote || canRemove);

    return (
      <TableRow key={m.id}>
        <TableCell className="font-medium">
          {staffFirstName(m) || "—"}
          {isSelf ? (
            <span className="text-muted-foreground font-normal text-xs ml-1">
              (you)
            </span>
          ) : null}
        </TableCell>
        <TableCell className="font-medium">{staffSurname(m) || "—"}</TableCell>
        <TableCell className="text-muted-foreground">
          {staffEmail(m) || "—"}
        </TableCell>
        <TableCell>
          <Badge
            variant={pending ? "secondary" : "outline"}
            className={
              pending
                ? "text-xs font-normal"
                : status === "admin"
                  ? "text-xs font-normal"
                  : "text-xs font-normal text-green-700 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-900 dark:bg-green-950/40"
            }
          >
            {statusBadgeLabel(m)}
          </Badge>
        </TableCell>
        <TableCell className="text-right w-12">
          {showMenu ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={busy}
                  className="h-8 w-8"
                  aria-label={`Actions for ${staffDisplayName(m)}`}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {pending ? (
                  <DropdownMenuItem
                    disabled={busy}
                    onClick={() => void handleAcceptPending(m)}
                  >
                    {busy ? "Accepting…" : "Accept"}
                  </DropdownMenuItem>
                ) : null}
                {canPromote ? (
                  <DropdownMenuItem
                    disabled={busy}
                    onClick={() => void handleToggleAdmin(m, true)}
                  >
                    Make admin
                  </DropdownMenuItem>
                ) : null}
                {canDemote ? (
                  <DropdownMenuItem
                    disabled={busy}
                    onClick={() => void handleToggleAdmin(m, false)}
                  >
                    Remove admin
                  </DropdownMenuItem>
                ) : null}
                {canRemove ? (
                  <DropdownMenuItem
                    disabled={busy}
                    className="text-destructive focus:text-destructive"
                    onClick={() => void handleRemove(m)}
                  >
                    Remove member
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 md:px-6 lg:px-8 pb-24 md:pb-8">
          <Card>
            <CardHeader className="p-6 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Company team
                  </h1>
                  <p className="text-sm text-muted-foreground font-normal mt-1">
                    Manage your company team. New sign-ups who pick your company
                    appear as Pending until you accept them.
                  </p>
                </div>
                {currentUserIsAdmin && companyId != null ? (
                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setInviteOpen(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add new member
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0 space-y-4">
              {loading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Loading team…
                </p>
              ) : companyId == null ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No linked company found. Complete company setup from your
                  profile to manage team members.
                </p>
              ) : memberships.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No team members yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Surname</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingMembers.map((m) => renderMemberRow(m, true))}
                    {activeMembers.map((m) => renderMemberRow(m, false))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add new member</DialogTitle>
              <DialogDescription>
                Enter their Breneo employer work email. They will receive an
                email with a link to join{" "}
                {companyName || "your company"}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="invite-email">Work email</Label>
              <Input
                id="invite-email"
                type="email"
                autoComplete="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                disabled={inviteSending}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                disabled={inviteSending}
                onClick={() => setInviteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={inviteSending || !inviteEmail.trim()}
                onClick={() => void handleSendInvite()}
              >
                {inviteSending ? "Sending…" : "Send invite"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
