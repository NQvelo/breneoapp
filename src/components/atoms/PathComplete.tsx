import { PartyPopper, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PathCompleteProps {
  professionTitle: string;
  onRestart?: () => void;
  className?: string;
}

export function PathComplete({
  professionTitle,
  onRestart,
  className,
}: PathCompleteProps) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center px-6 py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <PartyPopper className="h-8 w-8" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">
          Path complete!
        </h2>
        <p className="mb-6 max-w-md text-muted-foreground">
          You have finished all atoms for{" "}
          <span className="font-medium text-foreground">{professionTitle}</span>
          . Great work — keep building your skills.
        </p>
        {onRestart ? (
          <Button variant="outline" onClick={onRestart}>
            <RotateCcw className="h-4 w-4" />
            Choose another path
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
