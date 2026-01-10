import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface OnboardOptions {
  force?: boolean;
}

const MARKER = "<!-- ran:onboard -->";

const RAN_SECTION = `${MARKER}
## ran - Claude Code bash history

Use the \`ran\` CLI to search commands from previous Claude Code sessions:

- \`ran search <pattern>\` - Search by substring or regex (\`--regex\`)
- \`ran list\` - Show recent commands
- \`ran search "" --cwd /path\` - Filter by directory

Example: "What docker command did you run?" → \`ran search docker\`
`;

export function onboard(options: OnboardOptions = {}): void {
  const claudeDir = join(homedir(), ".claude");
  const targetFile = join(claudeDir, "CLAUDE.md");

  // Ensure ~/.claude directory exists
  if (!existsSync(claudeDir)) {
    mkdirSync(claudeDir, { recursive: true });
  }

  let existingContent = "";
  if (existsSync(targetFile)) {
    existingContent = readFileSync(targetFile, "utf-8");
  }

  if (existingContent.includes(MARKER)) {
    if (!options.force) {
      console.log(`ran section already exists in ${targetFile}`);
      console.log("Use --force to update it");
      return;
    }
    // Remove existing section for replacement
    const markerIndex = existingContent.indexOf(MARKER);
    const nextSectionMatch = existingContent.slice(markerIndex + MARKER.length).match(/\n## /);
    if (nextSectionMatch && nextSectionMatch.index !== undefined) {
      const endIndex = markerIndex + MARKER.length + nextSectionMatch.index;
      existingContent = existingContent.slice(0, markerIndex) + existingContent.slice(endIndex);
    } else {
      existingContent = existingContent.slice(0, markerIndex);
    }
  }

  const newContent = existingContent
    ? existingContent.trimEnd() + "\n\n" + RAN_SECTION
    : RAN_SECTION;

  writeFileSync(targetFile, newContent);

  const action = existingContent ? "Updated" : "Created";
  console.log(`${action} ${targetFile} with ran section`);
}
