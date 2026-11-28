import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ChevronRight,
  Loader2,
  Search,
  X,
} from "@/components/icons";
import { atomsApi, type Profession } from "@/api/atoms";
import { profileApi } from "@/api/profile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { useMobile } from "@/hooks/use-mobile";
import { normalizeSkillName } from "@/services/matching";

function skillTokens(value: string): string[] {
  return normalizeSkillName(value)
    .toLowerCase()
    .split(/[\s/,\-+().]+/)
    .filter(Boolean);
}

function skillsMatch(a: string, b: string): boolean {
  const na = normalizeSkillName(a).toLowerCase().trim();
  const nb = normalizeSkillName(b).toLowerCase().trim();
  if (!na || !nb) return false;
  if (na === nb) return true;
  const tokensA = skillTokens(a);
  const tokensB = skillTokens(b);
  return tokensA.some((ta) => tokensB.includes(ta));
}

function countMatchingSkills(
  professionSkills: string[],
  userSkills: string[],
): number {
  if (professionSkills.length === 0 || userSkills.length === 0) return 0;
  return professionSkills.filter((ps) =>
    userSkills.some((us) => skillsMatch(ps, us)),
  ).length;
}

export function ProfessionQuizSection({
  modalOpen: controlledModalOpen,
  onModalOpenChange,
}: {
  modalOpen?: boolean;
  onModalOpenChange?: (open: boolean) => void;
} = {}) {
  const { user } = useAuth();
  const t = useTranslation();
  const isMobile = useMobile();
  const navigate = useNavigate();
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const modalOpen = controlledModalOpen ?? internalModalOpen;
  const setModalOpen = onModalOpenChange ?? setInternalModalOpen;
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: profileSkills = [],
    isLoading: isLoadingProfileSkills,
  } = useQuery({
    queryKey: ["profileSkills", user?.id],
    queryFn: () => profileApi.getMySkills(),
    enabled: user?.id != null,
  });

  const {
    data: matchedProfessions = [],
    isLoading: isLoadingMatchedProfessions,
  } = useQuery({
    queryKey: ["atoms", "matched-professions"],
    queryFn: () => atomsApi.getMyProfessions(),
  });

  const {
    data: allProfessions = [],
    isLoading: isLoadingAllProfessions,
    isError: isAllProfessionsError,
  } = useQuery({
    queryKey: ["atoms", "professions"],
    queryFn: () => atomsApi.listProfessions(),
  });

  const matchedList = useMemo(() => {
    const userSkillNames = profileSkills
      .map((s) => s.skill_name)
      .filter(Boolean);

    const skillMatched = allProfessions
      .map((profession) => ({
        profession,
        score: countMatchingSkills(profession.skills, userSkillNames),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.profession);

    const seenIds = new Set(skillMatched.map((p) => p.id));
    const combined = [...skillMatched];
    for (const item of matchedProfessions) {
      if (!seenIds.has(item.profession.id)) {
        seenIds.add(item.profession.id);
        combined.push(item.profession);
      }
    }
    return combined;
  }, [allProfessions, matchedProfessions, profileSkills]);

  const isLoadingMatchedView =
    isLoadingAllProfessions ||
    isLoadingProfileSkills ||
    isLoadingMatchedProfessions;

  const matchedProgressQueries = useQueries({
    queries: matchedList.map((profession) => ({
      queryKey: ["atoms", "path", profession.id],
      queryFn: () => atomsApi.getProfessionAtomPath(profession.id),
    })),
  });

  const modalProgressQueries = useQueries({
    queries: modalOpen
      ? allProfessions.map((profession) => ({
          queryKey: ["atoms", "path", profession.id],
          queryFn: () => atomsApi.getProfessionAtomPath(profession.id),
        }))
      : [],
  });

  const filteredAllProfessions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return allProfessions;
    return allProfessions.filter(
      (profession) =>
        profession.title.toLowerCase().includes(query) ||
        profession.skills.some((skill) => skill.toLowerCase().includes(query)),
    );
  }, [allProfessions, searchQuery]);

  const handleOpenLesson = (profession: Profession) => {
    setModalOpen(false);
    navigate(`/courses/quizzes/${profession.id}`);
  };

  const handleModalOpenChange = (nextOpen: boolean) => {
    setModalOpen(nextOpen);
    if (!nextOpen) setSearchQuery("");
  };

  const modalSearchAndList = (
    <>
      <div className="relative shrink-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.atoms.searchLessonsPlaceholder}
          className="pl-9 pr-9"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        {isLoadingAllProfessions ? (
          <div className="flex items-center gap-3 px-4 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.atoms.loadingProfessionQuizzes}
          </div>
        ) : isAllProfessionsError ? (
          <div className="flex items-center gap-3 px-4 py-6 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {t.atoms.loadError}
          </div>
        ) : filteredAllProfessions.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {searchQuery.trim()
              ? t.atoms.noMatchingLessons
              : t.atoms.noProfessionQuizzes}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-3 md:gap-3">
            {filteredAllProfessions.map((profession) => {
              const originalIndex = allProfessions.findIndex(
                (item) => item.id === profession.id,
              );
              const progress =
                originalIndex >= 0
                  ? modalProgressQueries[originalIndex]
                  : undefined;

              return (
                <ProfessionModalLessonCard
                  key={profession.id}
                  profession={profession}
                  progress={progress}
                  loadErrorLabel={t.atoms.loadError}
                  onSelect={() => handleOpenLesson(profession)}
                />
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div>
      {isLoadingMatchedView ? (
        <div className="flex items-center gap-3 px-4 py-4 text-sm text-muted-foreground md:px-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t.atoms.loadingProfessionQuizzes}
        </div>
      ) : isAllProfessionsError && matchedList.length === 0 ? (
        <div className="flex items-center gap-3 px-4 py-4 text-sm text-destructive md:px-6">
          <AlertCircle className="h-4 w-4" />
          {t.atoms.loadError}
        </div>
      ) : matchedList.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground md:px-6">
          {t.atoms.noProfessionQuizzes}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-px bg-gray-200 dark:bg-gray-700 md:grid-cols-2">
          {matchedList.map((profession, index) => {
            const progress = matchedProgressQueries[index];

            return (
              <ProfessionLessonRow
                key={profession.id}
                profession={profession}
                progress={progress}
                loadErrorLabel={t.atoms.loadError}
                onSelect={() => handleOpenLesson(profession)}
              />
            );
          })}
        </div>
      )}

      {!isLoadingMatchedView && onModalOpenChange == null ? (
        <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700 md:px-6">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-center text-sm font-semibold text-breneo-blue hover:bg-breneo-blue/10 hover:text-breneo-blue"
            onClick={() => setModalOpen(true)}
          >
            {t.atoms.seeMore}
          </Button>
        </div>
      ) : null}

      {isMobile ? (
        <Sheet open={modalOpen} onOpenChange={handleModalOpenChange}>
          <SheetContent
            side="rightProfile"
            overlayClassName="backdrop-blur-sm bg-black/20 dark:bg-black/40"
            className="flex h-full flex-col overflow-hidden bg-white px-4 pt-6 pb-4 dark:bg-[#181818]"
          >
            <SheetHeader>
              <SheetTitle className="min-w-0 flex-1">
                {t.atoms.allLessonsTitle}
              </SheetTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-auto shrink-0"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5 text-black dark:text-white" />
              </Button>
            </SheetHeader>
            {modalSearchAndList}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={modalOpen} onOpenChange={handleModalOpenChange}>
          <DialogContent className="flex h-[min(640px,85vh)] w-[calc(100%-2rem)] max-w-4xl flex-col gap-4 overflow-hidden rounded-3xl border-gray-200 bg-white p-6 backdrop-blur-none dark:border-gray-800 dark:bg-[#181818]">
            <DialogHeader className="flex min-h-[2.5rem] flex-row items-center space-y-0 pr-10 text-left">
              <DialogTitle className="leading-normal">
                {t.atoms.allLessonsTitle}
              </DialogTitle>
            </DialogHeader>
            {modalSearchAndList}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ProfessionModalLessonCard({
  profession,
  progress,
  loadErrorLabel,
  onSelect,
}: {
  profession: Profession;
  progress?: {
    data?: Awaited<ReturnType<typeof atomsApi.getProfessionAtomPath>> | null;
    isError?: boolean;
  };
  loadErrorLabel: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full flex-row items-center gap-4 rounded-2xl bg-[#F4F5F7] px-4 py-3.5 text-left transition-colors hover:bg-[#EAECF0] dark:bg-[#2E2E2E] dark:hover:bg-[#383838] md:min-h-[96px] md:p-4"
    >
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-base font-semibold transition-colors group-hover:text-breneo-blue">
          {profession.title}
        </h3>
        {profession.skills.length > 0 ? (
          <p className="mt-1 truncate text-sm text-gray-500">
            {profession.skills.slice(0, 3).join(" · ")}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {progress?.data?.atoms.length ? (
          <ProfessionProgressRing path={progress.data} label={profession.title} />
        ) : progress?.isError ? (
          <span
            className="shrink-0 text-destructive"
            aria-label={loadErrorLabel}
            title={loadErrorLabel}
          >
            <AlertCircle className="h-4 w-4" />
          </span>
        ) : null}
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover:text-breneo-blue md:hidden" />
      </div>
    </button>
  );
}

function ProfessionLessonRow({
  profession,
  progress,
  loadErrorLabel,
  onSelect,
}: {
  profession: Profession;
  progress?: {
    data?: Awaited<ReturnType<typeof atomsApi.getProfessionAtomPath>> | null;
    isError?: boolean;
  };
  loadErrorLabel: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full items-center gap-4 bg-white px-4 py-4 text-left transition-colors hover:bg-gray-50 dark:bg-[#242424] dark:hover:bg-gray-800/70 md:px-6"
    >
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-base font-semibold transition-colors group-hover:text-breneo-blue">
          {profession.title}
        </h3>
        {profession.skills.length > 0 ? (
          <p className="mt-1 truncate text-sm text-gray-500">
            {profession.skills.slice(0, 3).join(" · ")}
          </p>
        ) : null}
      </div>
      {progress?.data?.atoms.length ? (
        <ProfessionProgressRing path={progress.data} label={profession.title} />
      ) : progress?.isError ? (
        <span
          className="shrink-0 text-destructive"
          aria-label={loadErrorLabel}
          title={loadErrorLabel}
        >
          <AlertCircle className="h-4 w-4" />
        </span>
      ) : null}
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400 transition-colors group-hover:text-breneo-blue" />
    </button>
  );
}

function ProfessionProgressRing({
  path,
  label,
}: {
  path: NonNullable<Awaited<ReturnType<typeof atomsApi.getProfessionAtomPath>>>;
  label: string;
}) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const segmentLength = circumference / path.atoms.length;
  const gap = Math.min(3, segmentLength * 0.2);
  const visibleLength = segmentLength - gap;

  return (
    <span
      className="relative flex h-11 w-11 shrink-0 items-center justify-center"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={path.total_count}
      aria-valuenow={path.completed_count}
    >
      <svg
        viewBox="0 0 40 40"
        className="absolute inset-0 h-full w-full -rotate-90"
        aria-hidden="true"
      >
        {path.atoms.map((atom, index) => (
          <circle
            key={`${atom.id}-${atom.sequence_order}`}
            cx="20"
            cy="20"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={`${visibleLength} ${circumference - visibleLength}`}
            strokeDashoffset={-index * segmentLength}
            className={
              atom.status === "completed"
                ? "text-primary"
                : "text-muted-foreground/25"
            }
          />
        ))}
      </svg>
      <span className="text-[9px] font-semibold tabular-nums text-foreground">
        {path.completed_count}/{path.total_count}
      </span>
    </span>
  );
}
