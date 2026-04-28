# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 3.x     | ✅ Yes     |
| 2.x     | ❌ No      |
| 1.x     | ❌ No      |
| 0.x     | ❌ No      |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it by
emailing [info@davideladisa.it](mailto:info@davideladisa.it). We are committed to responding within **7 working days**
and aim to resolve critical issues within **14 days**.

Please refrain from disclosing any security issues publicly until they are resolved.

## Scope

This policy applies to:

- The code in this repository
- Configuration files (e.g., `.env.example`, `vercel.json`)
- Deployment scripts and infrastructure configurations

## Skill Risk Filter

Starting from v3.0.0, the plugin includes a configurable risk filter that prevents potentially dangerous skills
from being loaded. Skills sourced from the upstream repository are classified by risk level (`none`, `safe`, `critical`,
`offensive`, `unknown`).

Users can exclude entire risk levels or specific skills via `~/.config/opencode/skill-filter.jsonc`:

```jsonc
{
  "excludedRiskLevels": ["offensive"],
  "excludedSkills": []
}
```

By default, all skills are loaded. We recommend excluding `offensive` skills unless you specifically need them for
authorized penetration testing.

For more details, see the [README](./README.md#skill-risk-filter).

## Thank You

We appreciate your efforts in helping us maintain the security and integrity of ``opencode-skills-collection``.
