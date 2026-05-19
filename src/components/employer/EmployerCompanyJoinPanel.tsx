import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmployerCompanySearchField } from "@/components/employer/EmployerCompanySearchField";
import {
  createEmployerDirectoryCompanyQuick,
  joinOrCreateEmployerAggregatorCompany,
  parseAggregatorCompanyPk,
  type AggregatorCompany,
} from "@/api/employer/aggregatorBffApi";
import { createEmployerJoinRequest } from "@/api/employer/employerJoinRequests";
import { toast } from "sonner";

type Props = {
  breneoUserId: string;
  onJoined?: () => void;
  onRequestSubmitted?: () => void;
};

/**
 * Search directory → join existing (admin approval) or create new company (immediate).
 */
export function EmployerCompanyJoinPanel({
  breneoUserId,
  onJoined,
  onRequestSubmitted,
}: Props) {
  const [pickerSelected, setPickerSelected] = useState<AggregatorCompany | null>(
    null,
  );
  const [pickerName, setPickerName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleQuickCreate = async (name: string) => {
    return createEmployerDirectoryCompanyQuick({
      name,
      breneoUserId,
    });
  };

  const handleSubmit = async () => {
    if (!breneoUserId.trim()) {
      toast.error("Could not resolve your user id.");
      return;
    }
    setSaving(true);
    try {
      if (pickerSelected?.id != null) {
        const pk = parseAggregatorCompanyPk(pickerSelected.id);
        if (pk == null) {
          toast.error("Invalid company id.");
          return;
        }
        const companyName =
          String(pickerSelected.name ?? pickerName).trim() || `Company ${pk}`;
        await createEmployerJoinRequest({
          companyId: pk,
          companyName,
        });
        toast.success(
          "Request sent. A company admin will review your request.",
        );
        onRequestSubmitted?.();
        return;
      }

      const name = pickerName.trim();
      if (name.length < 2) {
        toast.error("Enter a company name or select an existing company.");
        return;
      }
      await joinOrCreateEmployerAggregatorCompany({
        breneoUserId,
        mode: "new",
        createPayload: {
          name,
          company_email: "",
          domain: "",
        },
      });
      toast.success("Company created. Welcome!");
      onJoined?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not complete setup.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <EmployerCompanySearchField
        existingCompaniesOnly
        onQuickCreateCompany={handleQuickCreate}
        disabled={saving}
        selected={pickerSelected}
        onSelectExisting={(c) => {
          setPickerSelected(c);
          if (c?.name) setPickerName(String(c.name));
          else setPickerName("");
        }}
        companyName={pickerName}
        onCompanyNameChange={(v) => {
          setPickerName(v);
          if (pickerSelected) setPickerSelected(null);
        }}
      />
      <Button
        type="button"
        className="w-full h-12 rounded-xl"
        disabled={saving || (!pickerSelected && pickerName.trim().length < 2)}
        onClick={() => void handleSubmit()}
      >
        {saving
          ? "Please wait…"
          : pickerSelected
            ? "Request to join company"
            : "Create company"}
      </Button>
      {pickerSelected ? (
        <p className="text-xs text-center text-muted-foreground">
          Joining an existing company requires approval from a company admin.
        </p>
      ) : null}
    </div>
  );
}
