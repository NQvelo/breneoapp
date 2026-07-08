import React, { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useTranslation } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  atomsApi,
  type Atom,
  type AtomPathItem,
  type AtomSubmitResult,
  type Profession,
} from "@/api/atoms";
import { ProfessionPicker } from "@/components/atoms/ProfessionPicker";
import { AtomsPathMap } from "@/components/atoms/AtomsPathMap";
import { AtomStoryViewer } from "@/components/atoms/AtomStoryViewer";
import { PathComplete } from "@/components/atoms/PathComplete";

type PageView = "loading" | "picker" | "path" | "complete" | "empty" | "error";

const WebinarsPage = () => {
  const t = useTranslation();
  const queryClient = useQueryClient();

  const [selectedProfession, setSelectedProfession] =
    useState<Profession | null>(null);
  const [currentAtom, setCurrentAtom] = useState<Atom | null>(null);
  const [pageView, setPageView] = useState<PageView>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [storySession, setStorySession] = useState(0);

  const { data: matchedProfessions = [], isLoading: isLoadingMatched } =
    useQuery({
      queryKey: ["atoms", "matched-professions"],
      queryFn: () => atomsApi.getMyProfessions(),
    });

  const { data: allProfessions = [], isLoading: isLoadingCatalog } = useQuery({
    queryKey: ["atoms", "professions"],
    queryFn: () => atomsApi.listProfessions(),
    enabled: !isLoadingMatched && matchedProfessions.length === 0,
  });

  const {
    data: atomPath,
    isLoading: isLoadingPath,
    refetch: refetchAtomPath,
    isError: isPathError,
    error: pathQueryError,
  } = useQuery({
    queryKey: ["atoms", "path", selectedProfession?.id],
    queryFn: () => atomsApi.getProfessionAtomPath(selectedProfession!.id),
    enabled: !!selectedProfession,
    retry: 1,
  });

  const resolvePageView = useCallback(
    (path: typeof atomPath) => {
      if (!path || path.atoms.length === 0) {
        setPageView("empty");
        setErrorMessage(t.atoms.noAtoms);
        return;
      }

      if (path.completed_count >= path.total_count) {
        setPageView("complete");
        return;
      }

      setPageView("path");
    },
    [t.atoms.noAtoms],
  );

  useEffect(() => {
    if (isLoadingMatched) return;

    if (matchedProfessions.length > 0 && !selectedProfession) {
      setSelectedProfession(matchedProfessions[0].profession);
      return;
    }

    if (matchedProfessions.length === 0 && !isLoadingCatalog) {
      setPageView("picker");
    }
  }, [
    isLoadingMatched,
    isLoadingCatalog,
    matchedProfessions,
    selectedProfession,
  ]);

  useEffect(() => {
    if (!selectedProfession) return;

    if (isLoadingPath) {
      setPageView("loading");
      return;
    }

    if (isPathError) {
      setPageView("error");
      const status = (pathQueryError as { response?: { status?: number } })
        ?.response?.status;
      setErrorMessage(
        status === 401 ? t.auth.login : t.atoms.loadError,
      );
      return;
    }

    resolvePageView(atomPath);
  }, [
    selectedProfession,
    isLoadingPath,
    isPathError,
    atomPath,
    resolvePageView,
    pathQueryError,
    t.atoms.loadError,
    t.auth.login,
  ]);

  const submitMutation = useMutation({
    mutationFn: ({
      atomId,
      selectedOptionIndex,
    }: {
      atomId: number;
      selectedOptionIndex: 0 | 1 | 2;
    }) => atomsApi.submitAtomQuiz(atomId, selectedOptionIndex),
  });

  const handleProfessionSelect = (profession: Profession) => {
    setSelectedProfession(profession);
    setIsStoryOpen(false);
    setCurrentAtom(null);
    setPageView("loading");
    setErrorMessage(null);
  };

  const handleSelectAtom = async (item: AtomPathItem) => {
    if (!selectedProfession || item.status !== "available") return;

    try {
      const atom = await atomsApi.loadPlayableAtom(
        selectedProfession.id,
        item.id,
      );
      setCurrentAtom(atom);
      setStorySession((prev) => prev + 1);
      setIsStoryOpen(true);
    } catch {
      toast.error(t.atoms.loadError);
    }
  };

  const handleSubmitQuiz = async (
    selectedOptionIndex: 0 | 1 | 2,
  ): Promise<AtomSubmitResult> => {
    if (!currentAtom) {
      throw new Error(t.atoms.loadError);
    }

    return submitMutation.mutateAsync({
      atomId: currentAtom.id,
      selectedOptionIndex,
    });
  };

  const handleQuizComplete = async (result: AtomSubmitResult) => {
    if (!selectedProfession) return;

    if (result.passed && currentAtom) {
      atomsApi.rememberCompletedAtom(selectedProfession.id, currentAtom);
    }

    setIsStoryOpen(false);
    setCurrentAtom(null);

    if (result.passed) {
      toast.success(t.atoms.passedToast);
    } else {
      toast.error(t.atoms.failedToast);
    }

    setPageView("loading");
    await refetchAtomPath();
    await queryClient.invalidateQueries({
      queryKey: ["atoms", "path", selectedProfession.id],
    });
    setStorySession((prev) => prev + 1);
  };

  const handleChooseAnotherPath = () => {
    setSelectedProfession(null);
    setCurrentAtom(null);
    setIsStoryOpen(false);
    setPageView("picker");
    void queryClient.invalidateQueries({ queryKey: ["atoms"] });
  };

  const professionsForPicker =
    matchedProfessions.length > 0
      ? matchedProfessions.map((item) => item.profession)
      : allProfessions;

  const isInitialLoading =
    pageView === "loading" ||
    isLoadingMatched ||
    isLoadingCatalog ||
    isLoadingPath;

  const activeAtom = atomPath?.atoms.find(
    (atom) => atom.status === "available",
  );

  return (
    <DashboardLayout>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-1 py-2 sm:px-0">
        {/* <LearningPathHeader
          professionTitle={
            selectedProfession?.title ??
            atomPath?.profession_title ??
            t.atoms.title
          }
          completedCount={atomPath?.completed_count}
          totalCount={atomPath?.total_count}
        /> */}

        {isInitialLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="mx-auto h-16 w-16 rounded-full" />
            <Skeleton className="mx-auto h-16 w-16 rounded-full" />
          </div>
        ) : null}

        {pageView === "picker" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t.atoms.choosePath}
            </p>
            <ProfessionPicker
              professions={professionsForPicker}
              selectedProfessionId={selectedProfession?.id}
              onSelect={handleProfessionSelect}
            />
          </div>
        ) : null}

        {pageView === "path" && atomPath ? (
          <div className="space-y-6">
            {activeAtom ? (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 text-center text-sm text-muted-foreground">
                  {t.atoms.currentAtomHint}
                </CardContent>
              </Card>
            ) : null}
            <AtomsPathMap
              atoms={atomPath.atoms}
              statusLabels={{
                completed: t.atoms.statusCompleted,
                available: t.atoms.statusAvailable,
                locked: t.atoms.statusLocked,
              }}
              onSelectAtom={handleSelectAtom}
            />
          </div>
        ) : null}

        {pageView === "complete" && selectedProfession ? (
          <PathComplete
            professionTitle={selectedProfession.title}
            onRestart={handleChooseAnotherPath}
          />
        ) : null}

        {pageView === "empty" ? (
          <Card>
            <CardContent className="flex items-start gap-3 py-8">
              <AlertCircle className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-foreground">
                  {t.atoms.noAtomsTitle}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {errorMessage ?? t.atoms.noAtoms}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={handleChooseAnotherPath}
                >
                  {t.atoms.chooseAnotherPath}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {pageView === "error" ? (
          <Card>
            <CardContent className="flex items-start gap-3 py-8">
              <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <h3 className="font-semibold text-foreground">
                  {t.atoms.errorTitle}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {errorMessage ?? t.atoms.loadError}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => void refetchAtomPath()}
                >
                  {t.atoms.tryAgain}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {isStoryOpen && currentAtom ? (
        <div className="fixed inset-0 z-50 bg-white dark:bg-black">
          <AtomStoryViewer
            key={`${currentAtom.id}-${storySession}`}
            atom={currentAtom}
            onSubmit={handleSubmitQuiz}
            onComplete={handleQuizComplete}
            onClose={() => setIsStoryOpen(false)}
            className="h-full w-full"
          />
        </div>
      ) : null}
    </DashboardLayout>
  );
};

export default WebinarsPage;
