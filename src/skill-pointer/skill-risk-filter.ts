import type { RiskLevel } from "./risk-level.js";
import type { SkillIndexEntry } from "./vault-installer.js";
import type { SkillRiskFilterConfig } from "./config-loader.js";
import { logBlockedSkill, setFilterLogging } from "./filter-logger.js";

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
  setFilterLogging(config.loggingEnabled ?? true);

  return index.filter((entry) => {
    if (shouldLoad(entry.id, entry.risk, config)) {
      return true;
    }

    const effectiveRisk: RiskLevel = entry.risk ?? "unknown";
    const reason = (config.excludedRiskLevels ?? []).includes(effectiveRisk)
      ? "risk-level-excluded"
      : "skill-excluded";
    logBlockedSkill(entry.id, effectiveRisk, reason);
    return false;
  });
}
