import { searchCommands, type Command } from "../db";
import { sync } from "../sync";
import { formatCommand } from "../format";

export interface SearchOptions {
  regex?: boolean;
  cwd?: string;
  limit?: number;
  noSync?: boolean;
}

export async function search(pattern: string, options: SearchOptions = {}): Promise<void> {
  // Auto-sync before searching (unless disabled)
  if (!options.noSync) {
    await sync();
  }

  const results = await searchCommands(pattern, options.regex ?? false, options.cwd);
  const limited = options.limit ? results.slice(0, options.limit) : results;

  if (limited.length === 0) {
    console.log("No commands found matching:", pattern);
    return;
  }

  console.log(`Found ${results.length} command(s)${options.limit && results.length > options.limit ? ` (showing ${options.limit})` : ""}:\n`);

  for (const cmd of limited) {
    formatCommand(cmd);
  }
}
