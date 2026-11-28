import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "@/components/icons";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AtomsPathMap } from "@/components/atoms/AtomsPathMap";
import { ContentRenderer } from "@/components/atoms/ContentRenderer";
import { PathComplete } from "@/components/atoms/PathComplete";
import { QuizCard } from "@/components/atoms/QuizCard";
import { StoryProgressBar } from "@/components/atoms/StoryProgressBar";
import { atomsApi, type AtomSubmitResult } from "@/api/atoms";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/contexts/LanguageContext";
import { toast } from "sonner";

export default function ProfessionQuizPathPage() {
  const { professionId: professionIdParam, atomId: atomIdParam } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const t = useTranslation();
  const professionId = Number(professionIdParam);
  const atomId = Number(atomIdParam);
  const isValidProfessionId =
    Number.isInteger(professionId) && professionId > 0;
  const isValidAtomId =
    atomIdParam === undefined || (Number.isInteger(atomId) && atomId > 0);
  const [activeStep, setActiveStep] = useState(0);

  const {
    data: professions = [],
    isLoading: isLoadingProfessions,
    isError: isProfessionError,
  } = useQuery({
    queryKey: ["atoms", "professions"],
    queryFn: () => atomsApi.listProfessions(),
    enabled: isValidProfessionId,
  });

  const profession = professions.find((item) => item.id === professionId);

  const {
    data: path,
    isLoading: isLoadingPath,
    isError: isPathError,
    refetch: refetchPath,
  } = useQuery({
    queryKey: ["atoms", "path", professionId],
    queryFn: () => atomsApi.getProfessionAtomPath(professionId),
    enabled: isValidProfessionId && !!profession,
    retry: 1,
  });

  const atomPathItem = path?.atoms.find((item) => item.id === atomId);
  const isAtomPlayable =
    atomIdParam !== undefined &&
    (atomPathItem?.status === "available" ||
      atomPathItem?.status === "completed");
  const {
    data: activeAtom,
    isLoading: isLoadingAtom,
    isError: isAtomError,
    refetch: refetchAtom,
  } = useQuery({
    queryKey: ["atoms", "lesson", professionId, atomId],
    queryFn: () => atomsApi.loadPlayableAtom(professionId, atomId),
    enabled: !!profession && !!path && isAtomPlayable,
  });

  useEffect(() => {
    setActiveStep(0);
  }, [activeAtom?.id]);

  const sortedContentCards = useMemo(
    () =>
      [...(activeAtom?.content_cards ?? [])].sort(
        (a, b) => a.card_index - b.card_index,
      ),
    [activeAtom],
  );
  const totalLessonSteps = sortedContentCards.length + 1;
  const isQuizStep = activeStep >= sortedContentCards.length;
  const handlePreviousStep = () =>
    setActiveStep((step) => Math.max(step - 1, 0));
  const handleNextStep = () =>
    setActiveStep((step) => Math.min(step + 1, totalLessonSteps - 1));

  const submitQuizMutation = useMutation({
    mutationFn: ({
      atomId,
      selectedOptionIndex,
    }: {
      atomId: number;
      selectedOptionIndex: 0 | 1 | 2;
    }) => atomsApi.submitAtomQuiz(atomId, selectedOptionIndex),
  });

  const handleSelectAtom = (item: { id: number }) => {
    if (!profession) return;
    navigate(`/courses/quizzes/${profession.id}/atoms/${item.id}`);
  };

  const handleSubmitQuiz = (selectedOptionIndex: 0 | 1 | 2) => {
    if (!activeAtom) {
      throw new Error(t.atoms.loadError);
    }

    return submitQuizMutation.mutateAsync({
      atomId: activeAtom.id,
      selectedOptionIndex,
    });
  };

  const handleQuizComplete = async (result: AtomSubmitResult) => {
    if (!profession || !activeAtom) return;

    if (!result.passed) {
      toast.error(result.explanation || t.atoms.failedToast);
      navigate(`/courses/quizzes/${profession.id}`, { replace: true });
      return;
    }

    atomsApi.rememberCompletedAtom(profession.id, activeAtom);
    toast.success(t.atoms.passedToast);
    await queryClient.invalidateQueries({
      queryKey: ["atoms", "path", profession.id],
    });
    await refetchPath();
    navigate(`/courses/quizzes/${profession.id}`, { replace: true });
  };

  const isLoading =
    isValidProfessionId &&
    (isLoadingProfessions ||
      (!!profession &&
        (isLoadingPath || (isAtomPlayable && isLoadingAtom))));
  const hasError =
    !isValidProfessionId ||
    !isValidAtomId ||
    isProfessionError ||
    (!isLoadingProfessions && !profession) ||
    (!!profession && isPathError) ||
    (!!atomIdParam && !!path && !isAtomPlayable) ||
    isAtomError;

  return (
    <DashboardLayout showHeader showMobileNav={!atomIdParam}>
      <main className="relative isolate -mx-2 min-h-[calc(100dvh-6rem)] md:-mx-6">
        {path &&
        profession &&
        !atomIdParam &&
        path.atoms.length > 0 &&
        path.completed_count < path.total_count ? (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-[50vh] min-h-96 bg-gradient-to-t from-breneo-blue/30 via-breneo-blue/10 to-transparent md:hidden"
          />
        ) : null}
        <div className="relative z-10 mx-auto w-full max-w-7xl space-y-6 px-2 py-5 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        ) : hasError ? (
          <Card>
            <CardContent className="flex items-start gap-3 py-8">
              <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <h1 className="font-semibold text-foreground">
                  {t.atoms.errorTitle}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {profession
                    ? t.atoms.loadError
                    : t.atoms.professionNotFound}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    if (atomIdParam && isAtomError) {
                      void refetchAtom();
                    } else if (profession) {
                      void refetchPath();
                    } else {
                      void queryClient.invalidateQueries({
                        queryKey: ["atoms", "professions"],
                      });
                    }
                  }}
                >
                  {t.atoms.tryAgain}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : profession && activeAtom ? (
          <section className="space-y-5">
            {isQuizStep ? (
              <Card className="rounded-3xl">
                <CardContent className="space-y-5 p-5 sm:p-7">
                  <StoryProgressBar
                    totalSegments={totalLessonSteps}
                    activeIndex={Math.min(activeStep, totalLessonSteps - 1)}
                  />
                  <QuizCard
                    key={activeAtom.id}
                    lessonLayout
                    question={activeAtom.title}
                    options={[
                      activeAtom.quiz.options[0] ?? "",
                      activeAtom.quiz.options[1] ?? "",
                      activeAtom.quiz.options[2] ?? "",
                    ]}
                    onSubmit={handleSubmitQuiz}
                    onComplete={(result) => void handleQuizComplete(result)}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-3xl">
                <CardContent className="space-y-5 p-5 sm:p-7">
                  <StoryProgressBar
                    totalSegments={totalLessonSteps}
                    activeIndex={Math.min(activeStep, totalLessonSteps - 1)}
                  />
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                      {activeStep + 1}
                    </span>
                    <h2 className="text-lg font-semibold text-foreground">
                      {activeAtom.title}
                    </h2>
                  </div>
                  <ContentRenderer card={sortedContentCards[activeStep]} />
                  <div className="hidden items-center justify-between gap-3 rounded-xl p-3 md:flex">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={activeStep === 0}
                      onClick={handlePreviousStep}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      {t.atoms.previousStep}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleNextStep}
                      className="bg-breneo-blue text-white hover:bg-breneo-blue/90"
                    >
                      {activeStep === sortedContentCards.length - 1
                        ? t.atoms.startQuiz
                        : t.atoms.continueStep}
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {!isQuizStep ? (
              <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-border bg-background/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] backdrop-blur md:hidden">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  aria-label={t.atoms.previousStep}
                  disabled={activeStep === 0}
                  onClick={handlePreviousStep}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  type="button"
                  aria-label={
                    activeStep === sortedContentCards.length - 1
                      ? t.atoms.startQuiz
                      : t.atoms.continueStep
                  }
                  className="flex-1 bg-breneo-blue text-white hover:bg-breneo-blue/90"
                  onClick={handleNextStep}
                >
                  {activeStep === sortedContentCards.length - 1
                    ? t.atoms.startQuiz
                    : t.atoms.continueStep}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </section>
        ) : path && profession ? (
          path.atoms.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                {t.atoms.noAtoms}
              </CardContent>
            </Card>
          ) : path.completed_count >= path.total_count ? (
            <PathComplete
              professionTitle={profession.title}
              onRestart={() => navigate("/courses")}
            />
          ) : (
            <section className="space-y-4">
              <AtomsPathMap
                atoms={path.atoms}
                statusLabels={{
                  completed: t.atoms.statusCompleted,
                  available: t.atoms.statusAvailable,
                  locked: t.atoms.statusLocked,
                }}
                onSelectAtom={handleSelectAtom}
              />
            </section>
          )
        ) : !isLoading && !hasError ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {profession && path === null ? t.atoms.noAtoms : t.atoms.loadError}
            </CardContent>
          </Card>
        ) : null}
        </div>
      </main>
    </DashboardLayout>
  );
}
