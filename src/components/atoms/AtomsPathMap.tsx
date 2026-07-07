import type { AtomPathItem } from "@/api/atoms";
import { AtomPathNode } from "./AtomPathNode";
import { cn } from "@/lib/utils";

interface AtomsPathMapProps {
  atoms: AtomPathItem[];
  statusLabels: {
    completed: string;
    available: string;
    locked: string;
  };
  onSelectAtom: (atom: AtomPathItem) => void;
  className?: string;
}

function PathConnector({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "mx-auto h-10 w-0.5 rounded-full bg-border dark:bg-white/15",
        className,
      )}
    />
  );
}

export function AtomsPathMap({
  atoms,
  statusLabels,
  onSelectAtom,
  className,
}: AtomsPathMapProps) {
  return (
    <div className={cn("relative mx-auto w-full max-w-lg py-4", className)}>
      <div className="flex flex-col items-stretch gap-0">
        {atoms.map((atom, index) => {
          const alignment =
            index % 3 === 0 ? "center" : index % 3 === 1 ? "start" : "end";

          return (
            <div key={atom.id} className="flex flex-col">
              {index > 0 ? <PathConnector /> : null}
              <div
                className={cn(
                  "flex w-full",
                  alignment === "center" && "justify-center",
                  alignment === "start" && "justify-start pl-4 md:pl-10",
                  alignment === "end" && "justify-end pr-4 md:pr-10",
                )}
              >
                <AtomPathNode
                  atom={atom}
                  statusLabels={statusLabels}
                  onClick={() => {
                    if (atom.status === "available") {
                      onSelectAtom(atom);
                    }
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
