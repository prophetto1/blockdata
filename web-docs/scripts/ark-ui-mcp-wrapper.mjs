#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process from 'node:process';

const startupBanner = 'Ark UI MCP Server running on stdio';
const isWindows = process.platform === 'win32';
const child = isWindows
  ? spawn('cmd.exe', ['/d', '/s', '/c', 'npx.cmd -y @ark-ui/mcp'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })
  : spawn('npx', ['-y', '@ark-ui/mcp'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

process.stdin.pipe(child.stdin);
child.stderr.pipe(process.stderr);

let inspectingFirstLine = true;
let stdoutBuffer = '';

child.stdout.setEncoding('utf8');

child.stdout.on('data', (chunk) => {
  if (!inspectingFirstLine) {
    process.stdout.write(chunk);
    return;
  }

  stdoutBuffer += chunk;
  const newlineMatch = stdoutBuffer.match(/\r?\n/);

  if (!newlineMatch) {
    const maxBannerPrefix = startupBanner.length + 4;
    if (stdoutBuffer.length > maxBannerPrefix) {
      inspectingFirstLine = false;
      process.stdout.write(stdoutBuffer);
      stdoutBuffer = '';
    }
    return;
  }

  const newline = newlineMatch[0];
  const newlineIndex = stdoutBuffer.indexOf(newline);
  const firstLine = stdoutBuffer.slice(0, newlineIndex);
  const remainder = stdoutBuffer.slice(newlineIndex + newline.length);

  inspectingFirstLine = false;
  stdoutBuffer = '';

  if (firstLine === startupBanner) {
    process.stderr.write(`${firstLine}\n`);
  } else {
    process.stdout.write(`${firstLine}${newline}`);
  }

  if (remainder) {
    process.stdout.write(remainder);
  }
});

child.stdout.on('end', () => {
  if (stdoutBuffer) {
    process.stdout.write(stdoutBuffer);
    stdoutBuffer = '';
  }
});

child.on('error', (error) => {
  console.error('Failed to launch Ark UI MCP wrapper:', error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
