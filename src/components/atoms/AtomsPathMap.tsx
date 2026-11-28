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

export function AtomsPathMap({
  atoms,
  statusLabels,
  onSelectAtom,
  className,
}: AtomsPathMapProps) {
  return (
    <div className={cn("relative mx-auto w-full max-w-xl py-4", className)}>
      <div className="flex flex-col">
        {atoms.map((atom, index) => {
          const alignment = index % 4;

          return (
            <div
              key={`${atom.id}-${atom.sequence_order}`}
              className="flex min-h-[160px] items-center"
            >
              <div
                className={cn(
                  "flex w-full",
                  alignment === 0 && "justify-end pr-2 sm:pr-6",
                  alignment === 1 && "justify-center -translate-x-8",
                  alignment === 2 && "justify-start pl-2 sm:pl-6",
                  alignment === 3 && "justify-center translate-x-8",
                )}
              >
                <AtomPathNode
                  atom={atom}
                  statusLabels={statusLabels}
                  onClick={() => {
                    if (atom.status !== "locked") {
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
