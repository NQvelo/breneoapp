import React from "react";
import { cn } from "@/lib/utils";
import {
  cleanJobSectionListItem,
  splitPlainTextParagraphs,
} from "@/utils/jobSectionDisplay";

const bodyTextClass =
  "text-gray-600 dark:text-gray-300 leading-relaxed text-[0.9rem] md:text-md";

export function JobDescriptionParagraphs({ text }: { text: string }) {
  const paragraphs = splitPlainTextParagraphs(text);
  if (paragraphs.length === 0) return null;

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      {paragraphs.map((paragraph, index) => (
        <p
          key={index}
          className={cn(bodyTextClass, index > 0 && "mt-4")}
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}

export function JobSectionBulletList({ items }: { items: string[] }) {
  const cleaned = items.map(cleanJobSectionListItem).filter(Boolean);
  if (cleaned.length === 0) return null;

  return (
    <ul className="list-disc pl-5 space-y-2 marker:text-gray-400 dark:marker:text-gray-500">
      {cleaned.map((item, index) => (
        <li key={index} className={bodyTextClass}>
          {item}
        </li>
      ))}
    </ul>
  );
}
