import type { RiskLevel } from "./risk-level.js";
import type { SkillIndexEntry } from "./vault-installer.js";
import type { SkillRiskFilterConfig } from "./config-loader.js";

export function shouldLoad(
  skillId: string,
  risk: RiskLevel | undefined,
  config: SkillRiskFilterConfig
): boolean {
  const effectiveRisk: RiskLevel = risk ?? "unknown";

  if ((config.excludedRiskLevels ?? []).includes(effectiveRisk)) {
    return false;
  }

  if ((config.excludedSkills ?? []).includes(skillId)) {
    return false;
  }

  return true;
}

export function filterIndex(
  index: SkillIndexEntry[],
  config: SkillRiskFilterConfig
): SkillIndexEntry[] {
  return index.filter((entry) => {
    return shouldLoad(entry.id, entry.risk, config);
  });
}
