import os from "os";
import path from "path";
import fs from "fs";
import type { RiskLevel } from "./risk-level.js";

export interface SkillRiskFilterConfig {
  excludedRiskLevels?: RiskLevel[];
  excludedSkills?: string[];
  loggingEnabled?: boolean;
}

const DEFAULT_CONFIG: SkillRiskFilterConfig = {
  excludedRiskLevels: [],
  excludedSkills: [],
  loggingEnabled: true,
};

/**
 * Strips JSONC comments so content can be parsed as plain JSON.
 * Does NOT handle `//` inside string values.
 */
function stripJsoncComments(content: string): string {
  let result = content.replace(/\/\*[\s\S]*?\*\//g, "");
  result = result.replace(/\/\/.*$/gm, "");
  return result;
}

/**
 * Loads filter config from skill-filter.jsonc. Missing file or section returns defaults.
 * @param configPath Optional override (for testing).
 */
export function loadFilterConfig(
  configPath?: string
): SkillRiskFilterConfig {
  const resolvedPath =
    configPath ?? path.join(os.homedir(), ".config", "opencode", "skill-filter.jsonc");

  if (!fs.existsSync(resolvedPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = fs.readFileSync(resolvedPath, "utf-8");
    const stripped = stripJsoncComments(raw);
    const parsed = JSON.parse(stripped) as Record<string, unknown>;

    return {
      excludedRiskLevels: Array.isArray(parsed.excludedRiskLevels)
        ? (parsed.excludedRiskLevels as RiskLevel[])
        : DEFAULT_CONFIG.excludedRiskLevels,
      excludedSkills: Array.isArray(parsed.excludedSkills)
        ? (parsed.excludedSkills as string[])
        : DEFAULT_CONFIG.excludedSkills,
      loggingEnabled:
        typeof parsed.loggingEnabled === "boolean"
          ? parsed.loggingEnabled
          : DEFAULT_CONFIG.loggingEnabled,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}
