#!/usr/bin/env node
import { Command } from 'commander';
import { configCommand } from './commands/config.js';
import { disableCommand } from './commands/disable.js';
import { enableCommand } from './commands/enable.js';
import { initCommand } from './commands/init.js';
import { removeCommand } from './commands/remove.js';
import { statusCommand } from './commands/status.js';
import { updateCommand } from './commands/update.js';
import { packageVersion } from './core/paths.js';
import { notifyIfUpdateAvailable } from './core/update-check.js';

notifyIfUpdateAvailable();

const program = new Command();

program
  .name('engly')
  .description('Your English coach for AI prompts. One command. Every agent. Always on.')
  .version(packageVersion());

program
  .command('init')
  .description('Install Engly in the current project')
  .option('--tools <tools>', 'comma-separated agents: claude,codex,opencode,cursor,copilot')
  .option('--style <style>', 'feedback style: light or detailed')
  .option('-y, --yes', 'accept all defaults without asking')
  .option('--no-apply', "only install the skills, don't touch the agent files")
  .action(initCommand);

program.command('update').description('Update the skills and regenerate the Engly block').action(updateCommand);
program.command('enable').description('Turn the coach on permanently').action(enableCommand);
program.command('disable').description('Turn the coach off permanently, without uninstalling').action(disableCommand);
program
  .command('config')
  .description('Change an option, e.g. "engly config level B2"')
  .argument('<option>', 'language, level or style')
  .argument('<value>', 'new value')
  .action(configCommand);
program.command('status').description('Show where Engly is installed and whether it is active').action(statusCommand);
program
  .command('remove')
  .description('Remove the Engly block, skills and config')
  .option('-y, --yes', 'remove without asking')
  .action(removeCommand);

try {
  await program.parseAsync();
} catch (error) {
  console.error(`engly: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
