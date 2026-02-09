import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "lucide-react";
import type { ProfilePayload } from "@/api/profile/types";

export interface EditPersonalInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_number?: string;
    country_region?: string;
    city?: string;
    about_me?: string | null;
    social_links?: Record<string, string>;
  };
  onSave: (payload: ProfilePayload) => Promise<void>;
}

export function EditPersonalInfoModal({
  open,
  onOpenChange,
  initial,
  onSave,
}: EditPersonalInfoModalProps) {
  const [first_name, setFirst_name] = useState(initial.first_name ?? "");
  const [last_name, setLast_name] = useState(initial.last_name ?? "");
  const [email, setEmail] = useState(initial.email ?? "");
  const [phone_number, setPhone_number] = useState(initial.phone_number ?? "");
  const [country_region, setCountry_region] = useState(
    initial.country_region ?? "",
  );
  const [city, setCity] = useState(initial.city ?? "");
  const [github, setGithub] = useState(initial.social_links?.github ?? "");
  const [linkedin, setLinkedin] = useState(
    initial.social_links?.linkedin ?? "",
  );
  const [facebook, setFacebook] = useState(
    initial.social_links?.facebook ?? "",
  );
  const [instagram, setInstagram] = useState(
    initial.social_links?.instagram ?? "",
  );
  const [dribbble, setDribbble] = useState(
    initial.social_links?.dribbble ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeUrl = (url: string) =>
    url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;

  useEffect(() => {
    if (open) {
      setFirst_name(initial.first_name ?? "");
      setLast_name(initial.last_name ?? "");
      setEmail(initial.email ?? "");
      setPhone_number(initial.phone_number ?? "");
      setCountry_region(initial.country_region ?? "");
      setCity(initial.city ?? "");
      setGithub(initial.social_links?.github ?? "");
      setLinkedin(initial.social_links?.linkedin ?? "");
      setFacebook(initial.social_links?.facebook ?? "");
      setInstagram(initial.social_links?.instagram ?? "");
      setDribbble(initial.social_links?.dribbble ?? "");
      setError(null);
    }
  }, [open, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const social_links: Record<string, string> = {};
      if (github.trim()) social_links.github = normalizeUrl(github);
      if (linkedin.trim()) social_links.linkedin = normalizeUrl(linkedin);
      if (facebook.trim()) social_links.facebook = normalizeUrl(facebook);
      if (instagram.trim()) social_links.instagram = normalizeUrl(instagram);
      if (dribbble.trim()) social_links.dribbble = normalizeUrl(dribbble);
      await onSave({
        first_name: first_name.trim() || undefined,
        last_name: last_name.trim() || undefined,
        email: email.trim() || undefined,
        phone_number: phone_number.trim() || undefined,
        country_region: country_region.trim() || undefined,
        city: city.trim() || undefined,
        social_links: Object.keys(social_links).length
          ? social_links
          : undefined,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Could not save";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="rightProfile"
        overlayClassName="backdrop-blur-sm bg-black/20 dark:bg-black/40"
        className="flex flex-col h-full overflow-hidden px-4 py-6 md:p-8 bg-white dark:bg-[#181818]"
      >
        <SheetHeader className="bg-white dark:bg-[#181818] pb-3">
          <SheetTitle className="flex-1 min-w-0">Edit personal information</SheetTitle>
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <Button type="submit" form="edit-personal-info-form" size="sm" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-10 w-10 p-0 shrink-0"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>
        <form
          id="edit-personal-info-form"
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                value={first_name}
                onChange={(e) => setFirst_name(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                value={last_name}
                onChange={(e) => setLast_name(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone number</Label>
            <Input
              id="phone_number"
              value={phone_number}
              onChange={(e) => setPhone_number(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country_region">Country / Region</Label>
            <Input
              id="country_region"
              value={country_region}
              onChange={(e) => setCountry_region(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Social links (optional)</Label>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="github">GitHub</Label>
                <Input
                  id="github"
                  type="url"
                  placeholder="https://github.com/username"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  type="url"
                  placeholder="https://linkedin.com/in/username"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  type="url"
                  placeholder="https://facebook.com/username"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  type="url"
                  placeholder="https://instagram.com/username"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dribbble">Dribbble</Label>
                <Input
                  id="dribbble"
                  type="url"
                  placeholder="https://dribbble.com/username"
                  value={dribbble}
                  onChange={(e) => setDribbble(e.target.value)}
                />
              </div>
            </div>
          </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
