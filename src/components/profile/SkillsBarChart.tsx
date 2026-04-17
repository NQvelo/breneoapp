import React from "react";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Cell, LabelList } from "recharts";

interface SkillsBarChartProps {
  skills: Record<string, string>;
}

export function SkillsBarChart({ skills }: SkillsBarChartProps) {
  if (!skills || typeof skills !== "object" || Array.isArray(skills)) {
    return null;
  }

  const primaryColor = "#19B5FE";
  const chartData = Object.entries(skills)
    .filter(([_, pct]) => parseFloat(String(pct).replace("%", "")) > 0)
    .map(([skill, pct], idx) => {
      const percentage = parseFloat(String(pct).replace("%", ""));
      const opacity = percentage >= 40 ? 1 : 0.3 + (percentage / 40) * 0.7;
      const safeName = String(skill).replace(/\s+/g, "-").slice(0, 30);
      const uniqueId = `skill-${idx}-${safeName}`;
      const gradientId = `gradient-primary-${uniqueId}`;
      return {
        id: uniqueId,
        skill,
        percentage,
        opacity,
        fill: primaryColor,
        gradientId,
      };
    })
    .sort((a, b) => b.percentage - a.percentage);

  if (chartData.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-4">
        No skills data available
      </div>
    );
  }

  const CustomInsideLabel = (props: {
    x?: string | number;
    y?: string | number;
    width?: string | number;
    height?: string | number;
    payload?: { skill?: string };
    value?: string | { name?: string } | unknown;
  }) => {
    const { x, y, width, height, payload, value } = props;
    let skillName = "";
    if (typeof value === "string") skillName = value;
    else if (value && typeof value === "object" && "name" in value) {
      skillName = String((value as { name?: string }).name || "");
    } else if (payload?.skill) skillName = payload.skill;

    const xNum = typeof x === "number" ? x : typeof x === "string" ? parseFloat(x) : 0;
    const yNum = typeof y === "number" ? y : typeof y === "string" ? parseFloat(y) : 0;
    const widthNum =
      typeof width === "number" ? width : typeof width === "string" ? parseFloat(width) : 0;
    const heightNum =
      typeof height === "number" ? height : typeof height === "string" ? parseFloat(height) : 0;
    if (!xNum || !yNum || !widthNum || !heightNum || !skillName) return null;

    const centerX = xNum + widthNum / 2;
    const chartHeight = 250;
    const bottomMargin = 80;
    const skillY = chartHeight - bottomMargin + 25;
    const maxCharsPerLine = Math.max(8, Math.floor(widthNum / 6));
    const words = skillName.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      if (word.length > maxCharsPerLine) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = "";
        }
        for (let i = 0; i < word.length; i += maxCharsPerLine) {
          lines.push(word.slice(i, i + maxCharsPerLine));
        }
      } else if ((currentLine + " " + word).length <= maxCharsPerLine) {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    if (lines.length === 0 || (lines.length === 1 && lines[0].length > maxCharsPerLine * 1.5)) {
      lines.length = 0;
      for (let i = 0; i < skillName.length; i += maxCharsPerLine) {
        lines.push(skillName.slice(i, i + maxCharsPerLine));
      }
    }

    const displayLines = lines.slice(0, 2);
    const lineHeight = 14;
    const startY = skillY - ((displayLines.length - 1) * lineHeight) / 2;
    return (
      <text
        x={centerX}
        y={startY}
        fill="#374151"
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
        className="dark:fill-gray-200"
      >
        {displayLines.map((line, index) => (
          <tspan key={index} x={centerX} dy={index === 0 ? 0 : lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    );
  };

  const CustomBottomLabel = (props: {
    x?: string | number;
    y?: string | number;
    width?: string | number;
    height?: string | number;
    value?: number | { name?: string } | unknown;
    payload?: { skill?: string };
  }) => {
    const { x, y, width, height, value, payload } = props;
    const percentage = typeof value === "number" ? value : 0;
    const skillName = payload?.skill || "";
    const xNum = typeof x === "number" ? x : typeof x === "string" ? parseFloat(x) || 0 : 0;
    const yNum = typeof y === "number" ? y : typeof y === "string" ? parseFloat(y) || 0 : 0;
    const widthNum =
      typeof width === "number" ? width : typeof width === "string" ? parseFloat(width) || 0 : 0;
    const heightNum =
      typeof height === "number"
        ? height
        : typeof height === "string"
          ? parseFloat(height) || 0
          : 0;
    if (!xNum || !yNum || !widthNum || !heightNum) return null;

    const centerX = xNum + widthNum / 2;
    const chartHeight = 250;
    const bottomMargin = 80;
    const maxCharsPerLine = Math.max(8, Math.floor(widthNum / 6));
    const isLongName = skillName.length > maxCharsPerLine * 1.2;
    const percentY = chartHeight - bottomMargin + (isLongName ? 70 : 60);
    return (
      <text
        x={centerX}
        y={percentY}
        fill="#374151"
        textAnchor="middle"
        fontSize={13}
        fontWeight={700}
        className="dark:fill-gray-200"
      >
        {`${percentage.toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="w-full -mb-4">
      <ChartContainer config={{ percentage: { label: "Percentage" } }} className="h-[250px] w-full">
        <BarChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 80 }} barCategoryGap="25%">
          <defs>
            {chartData.map((entry) => (
              <linearGradient key={entry.gradientId} id={entry.gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={entry.fill} stopOpacity={entry.opacity} />
                <stop offset="100%" stopColor="#0EA5E9" stopOpacity={entry.opacity} />
              </linearGradient>
            ))}
          </defs>
          <XAxis dataKey="skill" hide />
          <YAxis type="number" domain={[0, 100]} hide />
          <ChartTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="rounded-3xl border-0 bg-white dark:bg-gray-800 p-4 backdrop-blur-sm">
                    <div className="flex flex-col gap-2">
                      <span className="font-semibold text-base text-gray-900 dark:text-gray-100">{data.skill}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: primaryColor, opacity: data.opacity }} />
                        <span className="font-bold text-lg" style={{ color: primaryColor, opacity: data.opacity }}>
                          {data.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar
            key={`bar-${chartData.map((e) => e.id).join("-")}`}
            dataKey="percentage"
            radius={[8, 8, 8, 8]}
            animationDuration={1000}
            animationEasing="ease-out"
          >
            {chartData.map((entry) => (
              <Cell key={entry.id} fill={`url(#${entry.gradientId})`} style={{ transition: "all 0.3s ease" }} />
            ))}
            <LabelList content={CustomInsideLabel} dataKey="skill" />
            <LabelList content={CustomBottomLabel} dataKey="percentage" />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
