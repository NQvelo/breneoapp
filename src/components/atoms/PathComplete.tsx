import { RotateCcw } from "@/components/icons";
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
        <img
          src="/lovable-uploads/3dicons-bookmark-fav-front-color.png"
          alt=""
          className="mb-5 h-28 w-28 object-contain"
        />
        <h2 className="mb-2 text-2xl font-bold text-foreground">
          Path complete!
        </h2>
        <p className="mb-6 max-w-md text-muted-foreground">
          You have finished all atoms for{" "}
          <span className="font-medium text-foreground">{professionTitle}</span>
          . Every lesson is progress. Keep your momentum going; your next
          breakthrough is one step away.
        </p>
        {onRestart ? (
          <Button variant="default" onClick={onRestart}>
            <RotateCcw className="h-4 w-4" />
            Choose another path
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
