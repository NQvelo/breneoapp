import type { ReactNode } from "react";
import type { Resume, ResumeEducation, ResumeWorkExperience } from "@/api/ats";
import { Mail, MapPin, Phone } from "@/components/icons";
import { useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  bilingualLines,
  formatDateRange,
  namedLines,
  showsLlmFallbackNote,
} from "./cvDisplay";

function TextLines({
  lines,
  className,
  secondaryClassName,
}: {
  lines: string[];
  className?: string;
  secondaryClassName?: string;
}) {
  if (lines.length === 0) return null;
  return (
    <div className={className}>
      {lines.map((line, index) => (
        <p
          key={`${index}-${line}`}
          className={cn(
            "whitespace-pre-line",
            index > 0 && (secondaryClassName ?? "text-muted-foreground"),
          )}
        >
          {line}
        </p>
      ))}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function WorkBlock({
  item,
  presentLabel,
}: {
  item: ResumeWorkExperience;
  presentLabel: string;
}) {
  const dates = formatDateRange(
    item.start_date,
    item.end_date,
    item.is_current,
    presentLabel,
  );
  const title = bilingualLines(item.title);
  const company = bilingualLines(item.company);
  const location = bilingualLines(item.location);
  const description = bilingualLines(item.description);
  if (!dates && !title.length && !company.length && !location.length && !description.length) {
    return null;
  }
  return (
    <article className="space-y-1">
      <TextLines lines={title} className="font-semibold text-foreground" />
      <TextLines lines={company} />
      <TextLines
        lines={location}
        className="text-sm text-muted-foreground"
        secondaryClassName="text-muted-foreground"
      />
      {dates ? <p className="text-sm text-muted-foreground">{dates}</p> : null}
      <TextLines lines={description} className="pt-1 text-sm leading-relaxed" />
    </article>
  );
}

function EducationBlock({
  item,
  presentLabel,
}: {
  item: ResumeEducation;
  presentLabel: string;
}) {
  const dates = formatDateRange(
    item.start_date,
    item.end_date,
    item.is_current,
    presentLabel,
  );
  const school = bilingualLines(item.school);
  const degree = bilingualLines(item.degree);
  const field = bilingualLines(item.field_of_study);
  if (!dates && !school.length && !degree.length && !field.length) return null;
  return (
    <article className="space-y-1">
      <TextLines lines={school} className="font-semibold text-foreground" />
      <TextLines lines={degree} />
      <TextLines lines={field} className="text-sm" />
      {dates ? <p className="text-sm text-muted-foreground">{dates}</p> : null}
    </article>
  );
}

function methodLabel(
  value: string | undefined,
  labels: Record<string, string>,
): string {
  const raw = value?.trim() ?? "";
  if (!raw) return "";
  return labels[raw] ?? raw;
}

export function CvDocument({
  resume,
  sourceFilename,
}: {
  resume: Resume;
  sourceFilename: string;
}) {
  const t = useTranslation();
  const copy = t.settings.accountPage.cv;
  const name = bilingualLines(resume.full_name);
  const headline = bilingualLines(resume.headline);
  const location = bilingualLines(resume.location);
  const summary = bilingualLines(resume.summary);
  const email = resume.email?.trim() ?? "";
  const phone = resume.phone?.trim() ?? "";
  const skills = (resume.skills ?? [])
    .map((skill) => namedLines(skill?.name_en, skill?.name_ka))
    .filter((lines) => lines.length > 0);
  const languages = (resume.languages ?? [])
    .map((language) => namedLines(language?.name_en, language?.name_ka))
    .filter((lines) => lines.length > 0);
  const certifications = (resume.certifications ?? [])
    .map((item) => bilingualLines(item))
    .filter((lines) => lines.length > 0);
  const filename = sourceFilename.trim() || resume.source_filename?.trim() || "";
  const parser = methodLabel(resume.parser_method, copy.parserMethods);
  const extraction = methodLabel(
    resume.extraction_method,
    copy.extractionMethods,
  );
  const meta = [filename, parser, extraction].filter(Boolean);
  const showLlmNote = showsLlmFallbackNote(resume.warnings);
  const hasContact = Boolean(email || phone || location.length);

  return (
    <article className="space-y-6">
      {name.length || headline.length ? (
        <header className="space-y-1">
          <TextLines
            lines={name}
            className="text-3xl font-semibold tracking-tight text-foreground"
            secondaryClassName="text-xl font-medium text-muted-foreground"
          />
          <TextLines lines={headline} className="text-base text-muted-foreground" />
        </header>
      ) : null}

      {hasContact ? (
        <Section title={copy.contact}>
          <div className="space-y-2 text-sm">
            {email ? (
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2 text-foreground hover:underline"
              >
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                {email}
              </a>
            ) : null}
            {phone ? (
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-2 text-foreground hover:underline"
              >
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                {phone}
              </a>
            ) : null}
            {location.length ? (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <TextLines lines={location} />
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {summary.length ? (
        <Section title={copy.summary}>
          <TextLines lines={summary} className="text-sm leading-relaxed" />
        </Section>
      ) : null}

      {skills.length ? (
        <Section title={copy.skills}>
          <ul className="flex flex-wrap gap-2">
            {skills.map((lines, index) => (
              <li
                key={`${index}-${lines[0]}`}
                className="rounded-full bg-muted px-3 py-1.5 text-sm leading-tight"
              >
                {lines.map((line, lineIndex) => (
                  <span
                    key={`${lineIndex}-${line}`}
                    className={cn(
                      "block",
                      lineIndex > 0 && "text-xs text-muted-foreground",
                    )}
                  >
                    {line}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {languages.length ? (
        <Section title={copy.languages}>
          <ul className="flex flex-wrap gap-2">
            {languages.map((lines, index) => (
              <li
                key={`${index}-${lines[0]}`}
                className="rounded-full bg-muted px-3 py-1.5 text-sm leading-tight"
              >
                {lines.map((line, lineIndex) => (
                  <span
                    key={`${lineIndex}-${line}`}
                    className={cn(
                      "block",
                      lineIndex > 0 && "text-xs text-muted-foreground",
                    )}
                  >
                    {line}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {(resume.work_experience ?? []).length ? (
        <Section title={copy.experience}>
          <div className="space-y-5">
            {resume.work_experience.map((item, index) => (
              <WorkBlock
                key={`${item.start_date}-${item.end_date}-${index}`}
                item={item}
                presentLabel={copy.present}
              />
            ))}
          </div>
        </Section>
      ) : null}

      {(resume.education ?? []).length ? (
        <Section title={copy.education}>
          <div className="space-y-5">
            {resume.education.map((item, index) => (
              <EducationBlock
                key={`${item.start_date}-${item.end_date}-${index}`}
                item={item}
                presentLabel={copy.present}
              />
            ))}
          </div>
        </Section>
      ) : null}

      {certifications.length ? (
        <Section title={copy.certifications}>
          <ul className="space-y-3">
            {certifications.map((lines, index) => (
              <li key={`${index}-${lines[0]}`}>
                <TextLines lines={lines} className="text-sm" />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {meta.length || showLlmNote ? (
        <footer className="space-y-2 border-t border-border/70 pt-4">
          {meta.length ? (
            <p className="text-xs text-muted-foreground">{meta.join(" · ")}</p>
          ) : null}
          {showLlmNote ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {copy.llmNote}
            </p>
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}
