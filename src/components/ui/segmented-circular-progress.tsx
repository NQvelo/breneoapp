import React from "react";
import { cn } from "@/lib/utils";

interface SkillData {
  skill: string;
  percentage: number;
  displayPct: string;
}

interface SegmentedCircularProgressProps {
  skills: SkillData[];
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export const SegmentedCircularProgress: React.FC<
  SegmentedCircularProgressProps
> = ({ skills, size = 200, strokeWidth = 20, className }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Each skill gets an equal segment of the circle with gaps between them
  const segmentCount = skills.length;
  const gapSize = 8; // Gap size in pixels (arc length) - larger for better visibility
  const totalGapSize = gapSize * segmentCount; // Total gap space needed
  const availableCircumference = circumference - totalGapSize; // Available space for segments
  const segmentArcLength = availableCircumference / segmentCount; // Equal segments for each skill

  // Generate colors for segments
  const generateColor = (index: number, total: number, percentage: number) => {
    const primaryColor = "#19B5FE"; // breneo-blue
    // Opacity based on percentage: 0.3 to 1.0
    const opacity = percentage >= 80 ? 1.0 : 0.3 + (percentage / 80) * 0.7;
    
    return {
      color: primaryColor,
      opacity,
    };
  };

  return (
    <div className={cn("flex items-center justify-start", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          {skills.map((skill, index) => {
            const { color, opacity } = generateColor(
              index,
              skills.length,
              skill.percentage
            );
            return (
              <linearGradient
                key={`gradient-${index}`}
                id={`gradient-${index}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={color} stopOpacity={opacity} />
                <stop offset="100%" stopColor={color} stopOpacity={opacity * 0.8} />
              </linearGradient>
            );
          })}
        </defs>
        
        {/* Background segments - light track showing full segment area, gaps remain completely transparent */}
        {skills.map((skill, index) => {
          // Start position accounting for gaps
          const segmentStartOffset = (index * segmentArcLength) + (index * gapSize);
          // Background shows full segment (100% of segmentArcLength)
          const backgroundDasharray = `${segmentArcLength} ${circumference}`;
          const backgroundDashoffset = -segmentStartOffset;

          return (
            <circle
              key={`bg-segment-${index}`}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-gray-100 dark:text-gray-800"
              strokeDasharray={backgroundDasharray}
              strokeDashoffset={backgroundDashoffset}
              strokeLinecap="round"
              opacity={0.2}
            />
          );
        })}

        {/* Segments - each segment is equal, filled based on skill percentage */}
        {skills.map((skill, index) => {
          // Calculate the start offset for this segment, accounting for gaps
          // Each segment starts after previous segment + gap
          const segmentStartOffset = (index * segmentArcLength) + (index * gapSize);
          
          // Calculate how much of this segment should be filled based on skill percentage
          const filledLength = (skill.percentage / 100) * segmentArcLength;
          
          // Create dash array: filled portion + gap (rest of circumference)
          // This ensures only the filled portion is visible, starting at the segment start
          const strokeDasharray = `${filledLength} ${circumference}`;
          const strokeDashoffset = -segmentStartOffset;
          
          const { color, opacity } = generateColor(
            index,
            skills.length,
            skill.percentage
          );

          return (
            <circle
              key={`segment-${index}`}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={`url(#gradient-${index})`}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
              style={{
                opacity: opacity,
              }}
            />
          );
        })}

        {/* Center text showing average percentage */}
        <g transform={`rotate(90 ${center} ${center})`}>
          <text
            x={center}
            y={center - 8}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-gray-900 dark:fill-gray-100 text-2xl font-bold"
          >
            {skills.length > 0
              ? `${Math.round(
                  skills.reduce((sum, s) => sum + s.percentage, 0) /
                    skills.length
                )}%`
              : "0%"}
          </text>
          <text
            x={center}
            y={center + 12}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-gray-600 dark:fill-gray-400 text-sm"
          >
            Performans
          </text>
        </g>
      </svg>
    </div>
  );
};

