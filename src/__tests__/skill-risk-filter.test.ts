import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import type { RiskLevel } from "../skill-pointer/risk-level.js";
import { shouldLoad, filterIndex } from "../skill-pointer/skill-risk-filter.js";
import { loadFilterConfig } from "../skill-pointer/config-loader.js";
import {
  logBlockedSkill,
  setFilterLogging,
  isFilterLoggingEnabled,
} from "../skill-pointer/filter-logger.js";
import { loadSkillsIndex, installSkillsToVault } from "../skill-pointer/vault-installer.js";
import { runSkillPointer } from "../skill-pointer/index.js";
import { generatePointers } from "../skill-pointer/pointer-generator.js";
import type { SkillIndexEntry } from "../skill-pointer/vault-installer.js";
import type { SkillRiskFilterConfig } from "../skill-pointer/config-loader.js";
import { POINTER_SUFFIX, SKILL_FILENAME } from "../constants/constants.js";
import fs from "fs";
import path from "path";
import os from "os";

describe("shouldLoad", () => {
  const defaultConfig: SkillRiskFilterConfig = {
    excludedRiskLevels: [],
    excludedSkills: [],
    loggingEnabled: true,
  };

  test("returns true for all risk levels when config has empty exclusions", () => {
    const levels: RiskLevel[] = ["none", "safe", "critical", "offensive", "unknown"];
    for (const level of levels) {
      expect(shouldLoad("any-skill", level, defaultConfig)).toBe(true);
    }
  });

  test("returns false when risk is in excludedRiskLevels", () => {
    const config: SkillRiskFilterConfig = {
      excludedRiskLevels: ["offensive"],
      excludedSkills: [],
      loggingEnabled: true,
    };
    expect(shouldLoad("ad-attacks", "offensive", config)).toBe(false);
    expect(shouldLoad("safe-tool", "safe", config)).toBe(true);
  });

  test("returns false when skillId is in excludedSkills", () => {
    const config: SkillRiskFilterConfig = {
      excludedRiskLevels: [],
      excludedSkills: ["my-skill"],
      loggingEnabled: true,
    };
    expect(shouldLoad("my-skill", "safe", config)).toBe(false);
    expect(shouldLoad("other-skill", "safe", config)).toBe(true);
  });

  test("treats undefined risk as unknown", () => {
    const config: SkillRiskFilterConfig = {
      excludedRiskLevels: ["unknown"],
      excludedSkills: [],
      loggingEnabled: true,
    };
    expect(shouldLoad("x", undefined, config)).toBe(false);
  });
});

describe("filterIndex", () => {
  const entries: SkillIndexEntry[] = [
    { id: "safe-tool", category: "dev", name: "Safe Tool", description: "A safe tool", risk: "safe" },
    { id: "offensive-tool", category: "security", name: "Offensive Tool", description: "An offensive tool", risk: "offensive" },
    { id: "unknown-tool", category: "dev", name: "Unknown Tool", description: "Unknown risk", risk: "unknown" },
    { id: "no-risk-tool", category: "dev", name: "No Risk Tool", description: "No risk field" },
  ];

  test("returns all entries with default config", () => {
    const config: SkillRiskFilterConfig = {
      excludedRiskLevels: [],
      excludedSkills: [],
      loggingEnabled: false,
    };
    const result = filterIndex(entries, config);
    expect(result.length).toBe(4);
  });

  test("filters out excluded risk levels", () => {
    const config: SkillRiskFilterConfig = {
      excludedRiskLevels: ["offensive"],
      excludedSkills: [],
      loggingEnabled: false,
    };
    const result = filterIndex(entries, config);
    expect(result.length).toBe(3);
    expect(result.find((e) => e.id === "offensive-tool")).toBeUndefined();
  });

  test("filters out excluded skills", () => {
    const config: SkillRiskFilterConfig = {
      excludedRiskLevels: [],
      excludedSkills: ["unknown-tool"],
      loggingEnabled: false,
    };
    const result = filterIndex(entries, config);
    expect(result.length).toBe(3);
    expect(result.find((e) => e.id === "unknown-tool")).toBeUndefined();
  });

  test("treats missing risk as unknown for filtering", () => {
    const config: SkillRiskFilterConfig = {
      excludedRiskLevels: ["unknown"],
      excludedSkills: [],
      loggingEnabled: false,
    };
    const result = filterIndex(entries, config);
    expect(result.find((e) => e.id === "no-risk-tool")).toBeUndefined();
    expect(result.find((e) => e.id === "unknown-tool")).toBeUndefined();
  });
});

describe("loadFilterConfig", () => {
  test("returns defaults for nonexistent file", () => {
    const config = loadFilterConfig("/tmp/nonexistent-opencode-test-" + Date.now() + ".jsonc");
    expect(config.excludedRiskLevels).toEqual([]);
    expect(config.excludedSkills).toEqual([]);
    expect(config.loggingEnabled).toBe(true);
  });

  test("parses JSONC with excludedRiskLevels", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "risk-filter-test-"));
    const configPath = path.join(tmpDir, "skill-filter.jsonc");
    fs.writeFileSync(
      configPath,
      `{
  // This is a comment
  "excludedRiskLevels": ["offensive", "unknown"],
  "excludedSkills": ["windows-privilege-escalation"],
  "loggingEnabled": false
}`
    );
    try {
      const config = loadFilterConfig(configPath);
      expect(config.excludedRiskLevels).toEqual(["offensive", "unknown"]);
      expect(config.excludedSkills).toEqual(["windows-privilege-escalation"]);
      expect(config.loggingEnabled).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("returns defaults when skillRiskFilter section is missing", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "risk-filter-test-"));
    const configPath = path.join(tmpDir, "skill-filter.jsonc");
    fs.writeFileSync(configPath, `{ "otherSection": { "key": "value" } }`);
    try {
      const config = loadFilterConfig(configPath);
      expect(config.excludedRiskLevels).toEqual([]);
      expect(config.loggingEnabled).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("filter-logger", () => {
  beforeEach(() => {
    setFilterLogging(true);
  });

  test("logBlockedSkill writes to stderr", () => {
    let captured = "";
    const originalWrite = process.stderr.write;
    process.stderr.write = (chunk: string | Buffer) => {
      if (typeof chunk === "string") captured += chunk;
      return true;
    };
    try {
      logBlockedSkill("test-skill", "offensive", "risk-level-excluded");
      expect(captured).toContain("[skill-risk-filter] BLOCKED");
      expect(captured).toContain('skill="test-skill"');
      expect(captured).toContain('risk="offensive"');
      expect(captured).toContain('reason="risk-level-excluded"');
    } finally {
      process.stderr.write = originalWrite;
    }
  });

  test("setFilterLogging(false) silences output", () => {
    let captured = "";
    const originalWrite = process.stderr.write;
    process.stderr.write = (chunk: string | Buffer) => {
      if (typeof chunk === "string") captured += chunk;
      return true;
    };
    try {
      setFilterLogging(false);
      logBlockedSkill("test", "offensive", "test");
      expect(captured).toBe("");
      expect(isFilterLoggingEnabled()).toBe(false);
    } finally {
      process.stderr.write = originalWrite;
    }
  });
});

describe("runSkillPointer integration with risk filter", () => {
  let tmpDir: string;
  let activeSkillsDir: string;
  let bundledSkillsPath: string;
  let vaultDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-pointer-integration-"));
    activeSkillsDir = path.join(tmpDir, "active-skills");
    bundledSkillsPath = path.join(tmpDir, "bundled-skills");
    vaultDir = path.join(tmpDir, "vault");
    configPath = path.join(tmpDir, "skill-filter.jsonc");

    fs.mkdirSync(bundledSkillsPath);
    
    const safeSkillDir = path.join(bundledSkillsPath, "safe-skill");
    fs.mkdirSync(safeSkillDir);
    fs.writeFileSync(path.join(safeSkillDir, "SKILL.md"), "---\nname: safe-skill\nrisk: safe\n---\nSafe content");

    const offensiveSkillDir = path.join(bundledSkillsPath, "offensive-skill");
    fs.mkdirSync(offensiveSkillDir);
    fs.writeFileSync(path.join(offensiveSkillDir, "SKILL.md"), "---\nname: offensive-skill\nrisk: offensive\n---\nOffensive content");

    const index: SkillIndexEntry[] = [
      { id: "safe-skill", category: "general", name: "Safe Skill", description: "Safe", risk: "safe" },
      { id: "offensive-skill", category: "security", name: "Offensive Skill", description: "Offensive", risk: "offensive" },
    ];
    fs.writeFileSync(path.join(tmpDir, "skills_index.json"), JSON.stringify(index));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("filters out offensive skills when configured", () => {
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        excludedRiskLevels: ["offensive"],
        loggingEnabled: false,
      })
    );

    runSkillPointer({
      activeSkillsDir,
      bundledSkillsPath,
      vaultDir,
      configPath,
    });

    expect(fs.existsSync(path.join(vaultDir, "general", "safe-skill"))).toBe(true);
    expect(fs.existsSync(path.join(vaultDir, "security", "offensive-skill"))).toBe(false);

    expect(fs.existsSync(path.join(activeSkillsDir, `general${POINTER_SUFFIX}`))).toBe(true);
    expect(fs.existsSync(path.join(activeSkillsDir, `security${POINTER_SUFFIX}`))).toBe(false);
  });

  test("loads all skills when no exclusions are set", () => {
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        excludedRiskLevels: [],
        loggingEnabled: false,
      })
    );

    runSkillPointer({
      activeSkillsDir,
      bundledSkillsPath,
      vaultDir,
      configPath,
    });

    expect(fs.existsSync(path.join(vaultDir, "general", "safe-skill"))).toBe(true);
    expect(fs.existsSync(path.join(vaultDir, "security", "offensive-skill"))).toBe(true);

    expect(fs.existsSync(path.join(activeSkillsDir, `general${POINTER_SUFFIX}`))).toBe(true);
    expect(fs.existsSync(path.join(activeSkillsDir, `security${POINTER_SUFFIX}`))).toBe(true);
  });
});

