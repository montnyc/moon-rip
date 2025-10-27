import React from "react";
import { render, Text, Box } from "@opentui/react";

interface ProgressProps {
  step: string;
  current: number;
  total: number;
}

export const ProgressIndicator: React.FC<ProgressProps> = ({ step, current, total }) => {
  const percentage = Math.round((current / total) * 100);
  const barWidth = 40;
  const filled = Math.round((percentage / 100) * barWidth);
  const empty = barWidth - filled;

  return (
    <Box flexDirection="column">
      <Text color="cyan">{step}</Text>
      <Box>
        <Text color="green">{"█".repeat(filled)}</Text>
        <Text color="gray">{"░".repeat(empty)}</Text>
        <Text> {percentage}%</Text>
      </Box>
    </Box>
  );
};

interface StatusProps {
  message: string;
  type: "info" | "success" | "error" | "warning";
}

export const Status: React.FC<StatusProps> = ({ message, type }) => {
  const colors = {
    info: "blue",
    success: "green",
    error: "red",
    warning: "yellow",
  } as const;

  const icons = {
    info: "ℹ",
    success: "✓",
    error: "✗",
    warning: "⚠",
  };

  return (
    <Box>
      <Text color={colors[type]}>{icons[type]} </Text>
      <Text>{message}</Text>
    </Box>
  );
};

export const UI = {
  showProgress: (step: string, current: number, total: number) => {
    render(<ProgressIndicator step={step} current={current} total={total} />);
  },

  showStatus: (message: string, type: "info" | "success" | "error" | "warning" = "info") => {
    render(<Status message={message} type={type} />);
  },

  clear: () => {
    console.clear();
  },
};
