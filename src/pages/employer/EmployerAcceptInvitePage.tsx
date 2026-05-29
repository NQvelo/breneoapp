import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

const INVITE_ILLUSTRATION = "/lovable-uploads/link.png";
import { toast } from "sonner";
import {
  acceptEmployerMemberInvite,
  fetchMemberInvitePreview,
  type MemberInvitePreview,
} from "@/api/employer/memberInvitesApi";
import { getLocalizedPath } from "@/utils/localeUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

const POST_LOGIN_REDIRECT_KEY = "breneo_post_login_redirect";

export default function EmployerAcceptInvitePage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const token = searchParams.get("token")?.trim() ?? "";

  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<MemberInvitePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [joinedCompanyName, setJoinedCompanyName] = useState<string | null>(
    null,
  );

  const returnPath = useMemo(() => {
    const path = `${location.pathname}${location.search}`;
    return path.startsWith("/")
      ? path
      : `/employer/accept-invite?token=${token}`;
  }, [location.pathname, location.search, token]);

  useEffect(() => {
    if (!token) {
      setPreviewError("This invite link is invalid or incomplete.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setPreviewError(null);
      try {
        const data = await fetchMemberInvitePreview(token);
        if (!cancelled) setPreview(data);
      } catch (e) {
        if (!cancelled) {
          setPreview(null);
          setPreviewError(
            e instanceof Error ? e.message : "Could not load invite.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const goToLogin = () => {
    sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, returnPath);
    navigate(getLocalizedPath("/auth/login", language));
  };

  const handleAccept = async () => {
    if (!token) return;
    if (!user?.id) {
      toast.error("Sign in as an employer to accept this invite.");
      goToLogin();
      return;
    }
    setAccepting(true);
    try {
      const result = await acceptEmployerMemberInvite(token);
      const name =
        result.company_name?.trim() || preview?.company_name || "your company";
      setJoinedCompanyName(name);
      toast.success(`You joined ${name}.`);
      sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
      window.setTimeout(() => {
        navigate(getLocalizedPath("/employer/home", language), {
          replace: true,
        });
      }, 1800);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not accept invite.");
    } finally {
      setAccepting(false);
    }
  };

  const expired = preview?.expired || preview?.status === "expired";
  const accepted = preview?.status === "accepted";
  const companyLabel = preview?.company_name?.trim() || "your company";
  const userRole = user?.user_type || localStorage.getItem("userRole") || "";
  const isEmployerAccount = userRole === "employer";
  const canAccept =
    Boolean(preview) &&
    !expired &&
    !accepted &&
    preview?.status === "pending" &&
    Boolean(user?.id) &&
    isEmployerAccount &&
    !authLoading &&
    !joinedCompanyName;

  return (
    <DashboardLayout showSidebar={false} showHeader={false}>
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md border-0 rounded-3xl shadow-sm">
          <CardContent className="pt-10 pb-10 px-6 text-center space-y-5">
            {joinedCompanyName ? (
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/40">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            ) : (
              <img
                src={INVITE_ILLUSTRATION}
                alt=""
                className="mx-auto h-20 w-20 object-contain"
                width={112}
                height={112}
              />
            )}

            {loading ? (
              <p className="text-sm text-muted-foreground">Loading invite…</p>
            ) : joinedCompanyName ? (
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-foreground">
                  You joined {joinedCompanyName}
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your account is now linked to this company. Redirecting you to
                  the employer dashboard…
                </p>
              </div>
            ) : previewError ? (
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-foreground">
                  Invite link problem
                </h1>
                <p className="text-sm text-destructive">{previewError}</p>
              </div>
            ) : preview ? (
              <>
                <div className="space-y-2">
                  <h1 className="text-xl font-bold text-foreground">
                    Join {companyLabel}
                  </h1>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {accepted
                      ? "This invite was already used."
                      : expired
                        ? "This invite has expired. Ask your company admin to send a new invite."
                        : `You were invited to join ${companyLabel} on Breneo. Tap the button below to accept.`}
                  </p>
                  {!accepted && !expired ? (
                    <p className="text-xs text-muted-foreground">
                      Use the employer account with{" "}
                      <strong>{preview.invitee_email}</strong>.
                    </p>
                  ) : null}
                </div>
                {!accepted && !expired ? (
                  authLoading ? (
                    <p className="text-sm text-muted-foreground">
                      Checking your account…
                    </p>
                  ) : !user?.id ? (
                    <Button
                      type="button"
                      className="w-full max-w-xs mx-auto"
                      onClick={goToLogin}
                    >
                      Sign in to join
                    </Button>
                  ) : !isEmployerAccount ? (
                    <p className="text-sm text-muted-foreground">
                      Sign in with an employer account (
                      <strong>{preview.invitee_email}</strong>) to accept this
                      invite.
                    </p>
                  ) : (
                    <Button
                      type="button"
                      className="w-full max-w-xs mx-auto"
                      disabled={!canAccept || accepting}
                      onClick={() => void handleAccept()}
                    >
                      {accepting ? "Joining…" : "Join company"}
                    </Button>
                  )
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Could not load invite details.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
