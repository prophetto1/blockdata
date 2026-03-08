import { spawn } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const wrapperPath = fileURLToPath(new URL('./ark-ui-mcp-wrapper.mjs', import.meta.url));
const startupBanner = 'Ark UI MCP Server running on stdio';

function fail(message, details = '') {
  console.error(message);
  if (details) {
    console.error(details);
  }
  process.exit(1);
}

const child = spawn(process.execPath, [wrapperPath], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stdout = '';
let stderr = '';

child.stdout.setEncoding('utf8');
child.stderr.setEncoding('utf8');

child.stdout.on('data', (chunk) => {
  stdout += chunk;
});

child.stderr.on('data', (chunk) => {
  stderr += chunk;
});

child.on('error', (error) => {
  fail('Failed to launch Ark UI MCP wrapper.', String(error));
});

const timer = setTimeout(() => {
  child.kill();
}, 8000);

child.on('exit', (code, signal) => {
  clearTimeout(timer);

  if (code !== 0 && signal === null) {
    fail(`Wrapper exited with code ${code}.`, stderr || stdout);
  }

  if (stdout.includes(startupBanner)) {
    fail('Wrapper leaked the Ark UI startup banner to stdout.', stdout);
  }

  if (!stderr.includes(startupBanner)) {
    fail('Wrapper did not redirect the Ark UI startup banner to stderr.', `STDERR:\n${stderr}\nSTDOUT:\n${stdout}`);
  }

  process.stdout.write('Ark UI MCP wrapper kept startup output off stdout.\n');
});
