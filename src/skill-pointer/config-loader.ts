import os from "os";
import path from "path";
import fs from "fs";
import stripJsonComments from "strip-json-comments";
import type { RiskLevel } from "./risk-level.js";

export interface SkillRiskFilterConfig {
  excludedRiskLevels?: RiskLevel[];
  excludedSkills?: string[];
}

const DEFAULT_CONFIG: SkillRiskFilterConfig = {
  excludedRiskLevels: [],
  excludedSkills: [],
};

export const DEFAULT_FILTER_CONFIG_PATH = path.join(
  os.homedir(),
  ".config",
  "opencode",
  "skill-filter.jsonc"
);

const VALID_RISK_LEVELS: RiskLevel[] = ["none", "safe", "critical", "offensive", "unknown"];

/**
 * Loads filter config from skill-filter.jsonc. Missing file or section returns defaults.
 * @param configPath Optional override (for testing).
 */
export function loadFilterConfig(
  configPath?: string
): SkillRiskFilterConfig {
  const resolvedPath = configPath ?? DEFAULT_FILTER_CONFIG_PATH;

  if (!fs.existsSync(resolvedPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = fs.readFileSync(resolvedPath, "utf-8");
    const stripped = stripJsonComments(raw);
    const parsed = JSON.parse(stripped) as Record<string, unknown>;

    return {
      excludedRiskLevels: Array.isArray(parsed.excludedRiskLevels)
        ? (parsed.excludedRiskLevels.filter((v: unknown) =>
            VALID_RISK_LEVELS.includes(v as RiskLevel)
          ) as RiskLevel[])
        : DEFAULT_CONFIG.excludedRiskLevels,
      excludedSkills: Array.isArray(parsed.excludedSkills)
        ? (parsed.excludedSkills as string[])
        : DEFAULT_CONFIG.excludedSkills,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}
