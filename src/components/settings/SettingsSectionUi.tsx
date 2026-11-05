import React from "react";
import { SegmentedControl } from "glisse";
import { useTheme } from "next-themes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const settingsSectionCardClassName =
  "border-0 rounded-3xl bg-white dark:bg-[#242424]";

export const settingsSectionHeaderClassName =
  "space-y-1 border-b-0 px-6 pb-3 pt-6";

export const settingsSectionContentClassName = "space-y-3 px-6 pb-6 pt-0";

interface SettingsSectionCardProps {
  title?: string;
  description?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
}

export function SettingsSectionCard({
  title,
  description,
  headerAction,
  children,
  contentClassName,
}: SettingsSectionCardProps) {
  const showHeader = Boolean(title || description || headerAction);

  return (
    <Card className={settingsSectionCardClassName}>
      {showHeader ? (
        <CardHeader className={settingsSectionHeaderClassName}>
          <div className="flex items-start justify-between gap-3">
            {title || description ? (
              <div className="space-y-1">
                {title ? (
                  <CardTitle className="text-base font-bold">{title}</CardTitle>
                ) : null}
                {description ? (
                  <CardDescription className="text-sm leading-relaxed">
                    {description}
                  </CardDescription>
                ) : null}
              </div>
            ) : (
              <div />
            )}
            {headerAction}
          </div>
        </CardHeader>
      ) : null}
      <CardContent
        className={cn(
          showHeader
            ? settingsSectionContentClassName
            : "space-y-3 p-6",
          contentClassName,
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}

interface SettingsSubsectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingsSubsection({
  title,
  children,
  className,
}: SettingsSubsectionProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

interface SettingsToggleRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

export function SettingsToggleRow({
  label,
  description,
  children,
}: SettingsToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-gray-50/90 px-4 py-3.5 dark:bg-white/5">
      <div className="min-w-0 flex-1">
        <Label className="text-sm font-semibold text-foreground">{label}</Label>
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

interface SettingsActionRowProps {
  label: string;
  description?: string;
  onClick: () => void;
  trailing?: React.ReactNode;
}

export function SettingsActionRow({
  label,
  description,
  onClick,
  trailing,
}: SettingsActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 rounded-2xl bg-gray-50/90 px-4 py-3.5 text-left transition-colors hover:bg-gray-100/90 dark:bg-white/5 dark:hover:bg-white/10"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {trailing}
    </button>
  );
}

interface SettingsFieldRowProps {
  label: string;
  children: React.ReactNode;
}

export function SettingsFieldRow({ label, children }: SettingsFieldRowProps) {
  return (
    <div className="space-y-2 rounded-2xl bg-gray-50/90 px-4 py-3.5 dark:bg-white/5">
      <Label className="text-sm font-semibold text-foreground">{label}</Label>
      {children}
    </div>
  );
}

interface SettingsSelectRowProps {
  label: string;
  children: React.ReactNode;
}

export function SettingsSelectRow({ label, children }: SettingsSelectRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-gray-50/90 px-4 py-3.5 dark:bg-white/5">
      <Label className="shrink-0 text-sm font-semibold text-foreground">
        {label}
      </Label>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export interface SettingsSegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface SettingsSegmentedRowProps<T extends string> {
  label: string;
  value: T;
  options: SettingsSegmentOption<T>[];
  onChange: (value: T) => void;
}

export function SettingsSegmentedRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: SettingsSegmentedRowProps<T>) {
  const { resolvedTheme } = useTheme();
  return (
    <div className="breneo-segmented-row flex flex-col gap-3 rounded-2xl bg-gray-50/90 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between dark:bg-white/5">
      <Label className="shrink-0 text-sm font-semibold text-foreground">
        {label}
      </Label>
      <SegmentedControl
        aria-label={label}
        className="breneo-segmented"
        data-theme={resolvedTheme === "dark" ? "dark" : "light"}
        value={value}
        onValueChange={(next) => onChange(next as T)}
        items={options.map((option) => ({
          value: option.value,
          label: option.icon ? (
            <span className="inline-flex items-center gap-1.5">
              {option.icon}
              {option.label}
            </span>
          ) : (
            option.label
          ),
        }))}
      />
    </div>
  );
}

interface SettingsListRowProps {
  primary: string;
  secondary?: string;
  trailing?: React.ReactNode;
}

export function SettingsListRow({
  primary,
  secondary,
  trailing,
}: SettingsListRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-gray-50/90 px-4 py-3.5 dark:bg-white/5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{primary}</p>
        {secondary ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{secondary}</p>
        ) : null}
      </div>
      {trailing}
    </div>
  );
}
