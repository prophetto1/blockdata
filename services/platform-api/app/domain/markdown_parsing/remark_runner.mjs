import { stdin, stdout, stderr } from "node:process";
import { fromMarkdown } from "mdast-util-from-markdown";

async function readStdin() {
  const chunks = [];
  for await (const chunk of stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

try {
  const source = await readStdin();
  const tree = fromMarkdown(source);
  stdout.write(JSON.stringify(tree));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  stderr.write(`${message}\n`);
  process.exitCode = 1;
}
