import { useQueries, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ChevronRight, Loader2 } from "@/components/icons";
import { atomsApi } from "@/api/atoms";
import { useTranslation } from "@/contexts/LanguageContext";

export function ProfessionQuizSection() {
  const t = useTranslation();
  const navigate = useNavigate();

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
    isError: isProfessionCatalogError,
  } = useQuery({
    queryKey: ["atoms", "professions"],
    queryFn: () => atomsApi.listProfessions(),
    enabled: !isLoadingMatchedProfessions && matchedProfessions.length === 0,
  });

  const professions =
    matchedProfessions.length > 0
      ? matchedProfessions.map((item) => item.profession)
      : allProfessions;

  const isLoading = isLoadingMatchedProfessions || isLoadingAllProfessions;
  const progressQueries = useQueries({
    queries: professions.map((profession) => ({
      queryKey: ["atoms", "path", profession.id],
      queryFn: () => atomsApi.getProfessionAtomPath(profession.id),
    })),
  });

  return (
    <>
      {isLoading ? (
        <div className="flex items-center gap-3 px-4 py-4 text-sm text-muted-foreground md:px-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t.atoms.loadingProfessionQuizzes}
        </div>
      ) : isProfessionCatalogError ? (
        <div className="flex items-center gap-3 px-4 py-4 text-sm text-destructive md:px-6">
          <AlertCircle className="h-4 w-4" />
          {t.atoms.loadError}
        </div>
      ) : professions.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground md:px-6">
          {t.atoms.noProfessionQuizzes}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-px bg-gray-200 dark:bg-gray-700 md:grid-cols-2">
          {professions.map((profession, index) => {
            const progress = progressQueries[index];

            return (
              <button
                key={profession.id}
                type="button"
                onClick={() =>
                  navigate(`/courses/quizzes/${profession.id}`)
                }
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
                  <ProfessionProgressRing
                    path={progress.data}
                    label={profession.title}
                  />
                ) : progress?.isError ? (
                  <span
                    className="shrink-0 text-destructive"
                    aria-label={t.atoms.loadError}
                    title={t.atoms.loadError}
                  >
                    <AlertCircle className="h-4 w-4" />
                  </span>
                ) : null}
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400 transition-colors group-hover:text-breneo-blue" />
              </button>
            );
          })}
        </div>
      )}
    </>
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
