import React, { useEffect, useRef, useState } from "react";
import { AxiosError } from "axios";
import { Check, SquarePen, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import apiClient from "@/api/auth/apiClient";
import { API_ENDPOINTS } from "@/api/auth/endpoints";
import {
  normalizeAcademyProfileApiResponse,
  toAcademyProfilePayload,
  type AcademyProfileApiRaw,
  type AcademyProfileNormalized,
} from "@/api/academy";
import { SettingsSubsection } from "@/components/settings/SettingsSectionUi";
import { cn } from "@/lib/utils";

type EditableField =
  | "academyName"
  | "phoneNumber"
  | "contactEmail"
  | "websiteUrl";

const settingsInputClassName =
  "h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0";

function validatePhoneNumber(phone: string): string | null {
  if (!phone.trim()) return null;
  const phoneRegex = /^\+?[\d\s\-().]{7,15}$/;
  const digitsOnly = phone.replace(/\D/g, "");
  if (
    !phoneRegex.test(phone) ||
    digitsOnly.length < 7 ||
    digitsOnly.length > 15
  ) {
    return "invalid";
  }
  return null;
}

function InlineEditableRow({
  label,
  value,
  displayValue,
  placeholder,
  type = "text",
  isEditing,
  disabled,
  error,
  onEdit,
  onCancel,
  onSave,
  onChange,
  editLabel,
  saveLabel,
  cancelLabel,
}: {
  label: string;
  value: string;
  displayValue: string;
  placeholder: string;
  type?: "text" | "email" | "tel";
  isEditing: boolean;
  disabled?: boolean;
  error?: string;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onChange: (value: string) => void;
  editLabel: string;
  saveLabel: string;
  cancelLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  return (
    <div className="rounded-2xl bg-gray-50/90 px-4 py-3.5 dark:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          {isEditing ? (
            <>
              <Input
                ref={inputRef}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className={settingsInputClassName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSave();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    onCancel();
                  }
                }}
              />
              {error ? (
                <p className="text-xs text-destructive">{error}</p>
              ) : null}
            </>
          ) : (
            <p className="truncate text-xs text-muted-foreground">
              {displayValue}
            </p>
          )}
        </div>

        {isEditing ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              aria-label={cancelLabel}
              onClick={onCancel}
              className={cn(
                "h-9 w-9 rounded-full text-muted-foreground",
                "hover:bg-muted hover:text-foreground",
                "dark:hover:bg-white/10",
              )}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              aria-label={saveLabel}
              onClick={onSave}
              className={cn(
                "h-9 w-9 rounded-full text-sky-600",
                "hover:bg-sky-100 hover:text-sky-700",
                "dark:text-sky-400 dark:hover:bg-sky-950/50 dark:hover:text-sky-300",
              )}
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-label={editLabel}
            onClick={onEdit}
            className={cn(
              "h-8 w-8 shrink-0 rounded-full text-gray-500",
              "hover:bg-muted hover:text-gray-700",
              "dark:text-white dark:hover:bg-white/10 dark:hover:text-white",
            )}
          >
            <SquarePen className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Button>
        )}
      </div>
    </div>
  );
}

export function AcademyAccountInfoCard() {
  const { user, updateUser, updateAcademyDisplay } = useAuth();
  const t = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [academyProfile, setAcademyProfile] =
    useState<AcademyProfileNormalized | null>(null);
  const [academyName, setAcademyName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [draft, setDraft] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const asText = (value: unknown) =>
    typeof value === "string" ? value : value == null ? "" : String(value);

  const applyProfile = (
    normalized: AcademyProfileNormalized,
    fallbackPhone = "",
  ) => {
    setAcademyProfile(normalized);
    setAcademyName(asText(normalized.academy_name));
    setWebsiteUrl(asText(normalized.website_url));
    setContactEmail(asText(normalized.contact_email));
    setPhoneNumber(
      asText(normalized.phone_number) || asText(fallbackPhone),
    );
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setPhoneNumber(user.phone_number || "");

      try {
        const response = await apiClient.get(API_ENDPOINTS.ACADEMY.PROFILE);
        if (cancelled) return;

        if (!response.data || typeof response.data !== "object") {
          setAcademyProfile(null);
          setAcademyName(asText(user.first_name));
          setContactEmail(asText(user.email));
          return;
        }

        const normalized = normalizeAcademyProfileApiResponse(
          response.data as AcademyProfileApiRaw,
          user.id != null ? String(user.id) : undefined,
        );
        applyProfile(normalized, asText(user.phone_number));
      } catch (error: unknown) {
        if (cancelled) return;
        const status = (error as AxiosError).response?.status;
        if (status === 404) {
          setAcademyProfile(null);
          setAcademyName(asText(user.first_name));
          setContactEmail(asText(user.email));
        } else {
          console.error("Failed to load academy profile:", error);
          toast.error(t.settings.accountPage.academyLoadError);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when user id changes
  }, [user?.id]);

  const getFieldValue = (field: EditableField) => {
    switch (field) {
      case "academyName":
        return academyName;
      case "phoneNumber":
        return phoneNumber;
      case "contactEmail":
        return contactEmail;
      case "websiteUrl":
        return websiteUrl;
    }
  };

  const startEditing = (field: EditableField) => {
    setPhoneError("");
    setDraft(getFieldValue(field));
    setEditingField(field);
  };

  const cancelEditing = () => {
    setPhoneError("");
    setDraft("");
    setEditingField(null);
  };

  const saveField = async (field: EditableField) => {
    const nextName =
      field === "academyName" ? draft.trim() : academyName.trim();
    const nextPhone =
      field === "phoneNumber" ? draft.trim() : phoneNumber.trim();
    const nextEmail =
      field === "contactEmail" ? draft.trim() : contactEmail.trim();
    const nextWebsite =
      field === "websiteUrl" ? draft.trim() : websiteUrl.trim();

    if (!nextName) {
      toast.error(t.settings.accountPage.academyNameRequired);
      return;
    }

    if (field === "phoneNumber" && validatePhoneNumber(nextPhone)) {
      setPhoneError(t.settings.accountPage.phoneInvalid);
      return;
    }

    const currentPhone =
      academyProfile?.phone_number || user?.phone_number || "";
    const hasChanges =
      nextName !== (academyProfile?.academy_name || "") ||
      nextPhone !== currentPhone ||
      nextWebsite !== (academyProfile?.website_url || "") ||
      nextEmail !== (academyProfile?.contact_email || "");

    if (!hasChanges) {
      cancelEditing();
      return;
    }

    if (!user?.id) {
      toast.error(t.settings.accountPage.userMissing);
      return;
    }

    setSaving(true);
    try {
      const payload = toAcademyProfilePayload({
        academy_name: nextName,
        description: academyProfile?.description || "",
        website_url: nextWebsite || null,
        contact_email: nextEmail || null,
        phone_number: nextPhone || null,
      });

      if (academyProfile) {
        await apiClient.patch(API_ENDPOINTS.ACADEMY.PROFILE, payload);
      } else {
        await apiClient.post(API_ENDPOINTS.ACADEMY.PROFILE, payload);
      }

      const refreshRes = await apiClient.get(API_ENDPOINTS.ACADEMY.PROFILE);
      const raw = refreshRes.data as AcademyProfileApiRaw;
      const normalized = normalizeAcademyProfileApiResponse(
        raw,
        String(user.id),
      );
      const phoneFromApi =
        normalized.phone_number ||
        (typeof raw.phone_number === "string" ? raw.phone_number : "") ||
        nextPhone;

      applyProfile(
        {
          ...normalized,
          academy_name: normalized.academy_name || nextName,
          phone_number: phoneFromApi,
        },
        nextPhone,
      );
      setPhoneError("");
      setEditingField(null);
      setDraft("");

      updateUser({
        first_name: normalized.first_name ?? nextName,
        phone_number: phoneFromApi,
      });
      updateAcademyDisplay({
        name: normalized.academy_name || nextName,
        email: normalized.contact_email,
        is_verified: normalized.is_verified,
        profile_image: normalized.logo_url ?? null,
      });

      toast.success(t.settings.accountPage.academySaveSuccess);
    } catch (err: unknown) {
      console.error("Error updating academy profile:", err);
      const axiosError = err as AxiosError<{
        detail?: string;
        message?: string;
      }>;
      const message =
        axiosError.response?.data?.detail ||
        axiosError.response?.data?.message ||
        (err instanceof Error ? err.message : null) ||
        t.settings.accountPage.academySaveError;
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const emptyLabel = "—";

  return (
    <SettingsSubsection title={t.settings.accountPage.academyInfo}>
      {loading ? (
        <p className="rounded-2xl bg-gray-50/90 px-4 py-3.5 text-sm text-muted-foreground dark:bg-white/5">
          {t.settings.list.loading}
        </p>
      ) : (
        <div className="space-y-2.5">
          <InlineEditableRow
            label={t.settings.accountPage.academyName}
            value={editingField === "academyName" ? draft : academyName}
            displayValue={academyName.trim() || emptyLabel}
            placeholder={t.settings.accountPage.academyNamePlaceholder}
            isEditing={editingField === "academyName"}
            disabled={saving}
            onEdit={() => startEditing("academyName")}
            onCancel={cancelEditing}
            onSave={() => void saveField("academyName")}
            onChange={setDraft}
            editLabel={t.common.edit}
            saveLabel={t.common.save}
            cancelLabel={t.common.cancel}
          />

          <InlineEditableRow
            label={t.settings.accountPage.phoneNumber}
            value={editingField === "phoneNumber" ? draft : phoneNumber}
            displayValue={phoneNumber.trim() || emptyLabel}
            placeholder={t.settings.accountPage.phonePlaceholder}
            type="tel"
            isEditing={editingField === "phoneNumber"}
            disabled={saving}
            error={editingField === "phoneNumber" ? phoneError : undefined}
            onEdit={() => startEditing("phoneNumber")}
            onCancel={cancelEditing}
            onSave={() => void saveField("phoneNumber")}
            onChange={(value) => {
              setDraft(value);
              if (!value.trim()) {
                setPhoneError("");
                return;
              }
              setPhoneError(
                validatePhoneNumber(value)
                  ? t.settings.accountPage.phoneInvalid
                  : "",
              );
            }}
            editLabel={t.common.edit}
            saveLabel={t.common.save}
            cancelLabel={t.common.cancel}
          />

          <InlineEditableRow
            label={t.settings.accountPage.contactEmail}
            value={editingField === "contactEmail" ? draft : contactEmail}
            displayValue={contactEmail.trim() || emptyLabel}
            placeholder={t.settings.accountPage.contactEmailPlaceholder}
            type="email"
            isEditing={editingField === "contactEmail"}
            disabled={saving}
            onEdit={() => startEditing("contactEmail")}
            onCancel={cancelEditing}
            onSave={() => void saveField("contactEmail")}
            onChange={setDraft}
            editLabel={t.common.edit}
            saveLabel={t.common.save}
            cancelLabel={t.common.cancel}
          />

          <InlineEditableRow
            label={t.settings.accountPage.website}
            value={editingField === "websiteUrl" ? draft : websiteUrl}
            displayValue={websiteUrl.trim() || emptyLabel}
            placeholder={t.settings.accountPage.websitePlaceholder}
            isEditing={editingField === "websiteUrl"}
            disabled={saving}
            onEdit={() => startEditing("websiteUrl")}
            onCancel={cancelEditing}
            onSave={() => void saveField("websiteUrl")}
            onChange={setDraft}
            editLabel={t.common.edit}
            saveLabel={t.common.save}
            cancelLabel={t.common.cancel}
          />
        </div>
      )}
    </SettingsSubsection>
  );
}
