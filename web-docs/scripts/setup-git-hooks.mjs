import { execFileSync } from 'node:child_process';

execFileSync('git', ['config', 'core.hooksPath', '.githooks'], {
  cwd: process.cwd(),
  stdio: 'inherit',
});

console.log('Configured git hooks path to .githooks');
