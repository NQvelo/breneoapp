import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import katex from "katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";
import type { ContentCard } from "@/api/atoms";
import { cn } from "@/lib/utils";
import "katex/dist/katex.min.css";

interface ContentRendererProps {
  card: ContentCard;
  className?: string;
}

function renderKatex(math: string, displayMode: boolean): string {
  try {
    return katex.renderToString(math, {
      displayMode,
      throwOnError: false,
    });
  } catch {
    return math;
  }
}

function CodeBlock({
  code,
  language,
}: {
  code: string;
  language?: string;
}) {
  const { resolvedTheme } = useTheme();
  const style = resolvedTheme === "dark" ? oneDark : oneLight;

  return (
    <SyntaxHighlighter
      language={language || "text"}
      style={style}
      customStyle={{
        margin: 0,
        borderRadius: "0.75rem",
        fontSize: "0.875rem",
        lineHeight: 1.6,
      }}
      wrapLongLines
    >
      {code}
    </SyntaxHighlighter>
  );
}

const markdownComponents = {
  code({
    className,
    children,
    ...props
  }: React.ComponentPropsWithoutRef<"code"> & { inline?: boolean }) {
    const match = /language-(\w+)/.exec(className || "");
    const codeText = String(children).replace(/\n$/, "");

    if (!match && !codeText.includes("\n")) {
      return (
        <code
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm"
          {...props}
        >
          {children}
        </code>
      );
    }

    return <CodeBlock code={codeText} language={match?.[1]} />;
  },
};

export function ContentRenderer({ card, className }: ContentRendererProps) {
  const content = useMemo(() => {
    switch (card.content_type) {
      case "markdown":
        return (
          <div
            className={cn(
              "prose prose-sm sm:prose-base max-w-none dark:prose-invert",
              "prose-headings:font-semibold prose-p:leading-relaxed",
              className,
            )}
          >
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={markdownComponents}
            >
              {card.content_body}
            </ReactMarkdown>
          </div>
        );

      case "code":
        return (
          <div className={cn("overflow-hidden rounded-xl", className)}>
            <CodeBlock code={card.content_body} />
          </div>
        );

      case "math_formula": {
        const trimmed = card.content_body.trim();
        const isBlock =
          trimmed.includes("\n") ||
          trimmed.startsWith("\\[") ||
          trimmed.startsWith("$$");
        const math = trimmed
          .replace(/^\\\[/, "")
          .replace(/\\\]$/, "")
          .replace(/^\$\$/, "")
          .replace(/\$\$$/, "")
          .replace(/^\$/, "")
          .replace(/\$$/, "");

        return (
          <div
            className={cn(
              "flex items-center justify-center overflow-x-auto py-4",
              className,
            )}
            dangerouslySetInnerHTML={{
              __html: renderKatex(math, isBlock),
            }}
          />
        );
      }

      case "rich_text":
      default:
        if (/<\/?[a-z][\s\S]*>/i.test(card.content_body.trim())) {
          return (
            <div
              className={cn(
                "prose prose-sm sm:prose-base max-w-none dark:prose-invert",
                className,
              )}
              dangerouslySetInnerHTML={{ __html: card.content_body }}
            />
          );
        }

        return (
          <p
            className={cn(
              "whitespace-pre-wrap text-base leading-relaxed text-foreground",
              className,
            )}
          >
            {card.content_body}
          </p>
        );
    }
  }, [card, className]);

  return (
    <div className="w-full max-h-[42vh] overflow-y-auto scrollbar-hide md:max-h-[50vh] lg:max-h-[460px]">
      {content}
    </div>
  );
}
