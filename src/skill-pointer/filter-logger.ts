import type { RiskLevel } from "./risk-level.js";

let loggingEnabled = true;

export function setFilterLogging(enabled: boolean): void {
  loggingEnabled = enabled;
}

export function logBlockedSkill(skillId: string, risk: RiskLevel, reason: string): void {
  if (!loggingEnabled) return;
  const ts = new Date().toISOString();
  process.stderr.write(`[skill-risk-filter] BLOCKED skill="${skillId}" risk="${risk}" reason="${reason}" ts="${ts}"\n`);
}

export function isFilterLoggingEnabled(): boolean {
  return loggingEnabled;
}