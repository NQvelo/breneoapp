import React from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import OptimizedAvatar from "@/components/ui/OptimizedAvatar";
import { cn } from "@/lib/utils";
import type { CourseEnrolledUser } from "@/api/academy/courseApi";
import {
  enrolledUserNumericId,
  useEnrolledUserPublicProfiles,
} from "@/hooks/useEnrolledUserPublicProfiles";
import type { PublicUserProfile } from "@/api/profile/publicUserProfileTypes";

function enrolledDisplayName(
  user: CourseEnrolledUser,
  profile?: PublicUserProfile | null,
): string {
  const fromProfile = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fromProfile) return fromProfile;
  const fromEnrolled = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fromEnrolled || user.email || String(user.id);
}

function enrolledAvatarFallback(
  user: CourseEnrolledUser,
  profile?: PublicUserProfile | null,
): string {
  const name = enrolledDisplayName(user, profile);
  return (name.charAt(0) || "U").toUpperCase();
}

function enrolledPhone(
  user: CourseEnrolledUser,
  profile?: PublicUserProfile | null,
): string {
  const phone = profile?.phone_number?.trim();
  if (phone) return phone;
  return "—";
}

interface AcademyCourseRegisteredPanelProps {
  enrolledUsers: CourseEnrolledUser[];
}

export function AcademyCourseRegisteredPanel({
  enrolledUsers,
}: AcademyCourseRegisteredPanelProps) {
  const { profileByUserId, isLoading } =
    useEnrolledUserPublicProfiles(enrolledUsers);

  return (
    <Card>
      <CardHeader className="px-4 py-3 my-0 border-b-0">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          Registered users
          <span className="text-sm font-normal text-muted-foreground">
            ({enrolledUsers.length})
          </span>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-3">
        {enrolledUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1">
            No students have registered for this course yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {enrolledUsers.map((user, index) => {
              const userId = enrolledUserNumericId(user);
              const profile =
                userId != null ? profileByUserId.get(userId) : undefined;
              return (
                <RegisteredUserListItem
                  key={String(user.id ?? user.email ?? index)}
                  user={user}
                  profile={profile}
                />
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RegisteredUserListItem({
  user,
  profile,
}: {
  user: CourseEnrolledUser;
  profile?: PublicUserProfile;
}) {
  const name = enrolledDisplayName(user, profile);
  const email = profile?.email?.trim() || user.email?.trim() || "";
  const phone = enrolledPhone(user, profile);
  const avatarSrc = profile?.profile_image?.trim() || undefined;

  return (
    <li>
      <div
        className={cn(
          "w-full rounded-xl px-3 py-3",
          "bg-gray-50 dark:bg-gray-800/40",
        )}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <OptimizedAvatar
              src={avatarSrc}
              alt={name}
              fallback={enrolledAvatarFallback(user, profile)}
              size="md"
              className="h-10 w-10 shrink-0 rounded-full"
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {name}
              </p>
              {email ? (
                <p className="text-sm text-muted-foreground truncate">
                  {email}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center justify-end sm:justify-center text-sm text-muted-foreground shrink-0 tabular-nums">
            {phone}
          </div>
        </div>
      </div>
    </li>
  );
}
