import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SettingsListItemConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconBgClass: string;
  iconColorClass: string;
  onClick: () => void;
  destructive?: boolean;
}

interface SettingsListItemProps extends SettingsListItemConfig {
  isLast?: boolean;
}

export function SettingsListItem({
  icon: Icon,
  iconBgClass,
  iconColorClass,
  title,
  subtitle,
  onClick,
  isLast,
  destructive,
}: SettingsListItemProps) {
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50/80 active:bg-gray-100/80 dark:hover:bg-gray-800/40",
          destructive && "hover:bg-red-50/80 dark:hover:bg-red-950/20",
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            iconBgClass,
          )}
        >
          <Icon className={cn("h-5 w-5", iconColorClass)} />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-semibold",
              destructive ? "text-red-600 dark:text-red-500" : "text-foreground",
            )}
          >
            {title}
          </p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </button>
      {!isLast && (
        <div className="ml-[4.25rem] mr-4 border-b border-gray-100 dark:border-gray-700/60" />
      )}
    </>
  );
}

export function SettingsGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl border-0 bg-white dark:bg-[#242424]">
      {children}
    </div>
  );
}

interface SettingsGroupListProps {
  groups: SettingsListItemConfig[][];
  footerItem?: SettingsListItemConfig;
  beforeFooter?: React.ReactNode;
}

export function SettingsGroupList({
  groups,
  footerItem,
  beforeFooter,
}: SettingsGroupListProps) {
  return (
    <div className="space-y-4">
      {groups.map((group, groupIndex) => (
        <SettingsGroup key={groupIndex}>
          {group.map((item, itemIndex) => (
            <SettingsListItem
              key={item.id}
              {...item}
              isLast={itemIndex === group.length - 1}
            />
          ))}
        </SettingsGroup>
      ))}
      {beforeFooter}
      {footerItem && (
        <SettingsGroup>
          <SettingsListItem {...footerItem} isLast />
        </SettingsGroup>
      )}
    </div>
  );
}
