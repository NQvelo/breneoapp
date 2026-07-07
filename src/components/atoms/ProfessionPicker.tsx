import type { Profession } from "@/api/atoms";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfessionPickerProps {
  professions: Profession[];
  onSelect: (profession: Profession) => void;
  selectedProfessionId?: number;
  className?: string;
}

export function ProfessionPicker({
  professions,
  onSelect,
  selectedProfessionId,
  className,
}: ProfessionPickerProps) {
  if (professions.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-10 text-center text-muted-foreground">
          No career paths are available yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {professions.map((profession) => {
        const isSelected = profession.id === selectedProfessionId;

        return (
          <button
            key={profession.id}
            type="button"
            onClick={() => onSelect(profession)}
            className={cn(
              "rounded-xl border bg-card text-left transition-colors",
              "hover:border-primary/40 hover:bg-muted/40",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              isSelected && "border-primary ring-2 ring-primary/20",
            )}
          >
            <CardContent className="flex items-start gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="truncate font-semibold text-foreground">
                    {profession.title}
                  </h3>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {profession.description}
                </p>
                {profession.skills.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {profession.skills.slice(0, 4).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </button>
        );
      })}
    </div>
  );
}
