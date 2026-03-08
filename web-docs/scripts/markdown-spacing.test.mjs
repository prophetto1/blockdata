import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const stylesheetSource = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');

run('docs markdown spacing uses a compact vertical rhythm', () => {
  assert.match(stylesheetSource, /--sl-content-gap-y:\s*0\.88rem;/);
  assert.match(
    stylesheetSource,
    /\.sl-markdown-content\s*:not\(a, strong, em, del, span, input, code, br\)\s*\+\s*:not\(a, strong, em, del, span, input, code, br, :where\(\.not-content \*\)\),[\s\S]*?margin-top:\s*var\(--sl-content-gap-y\);/,
  );
  assert.match(
    stylesheetSource,
    /\.sl-markdown-content\s*:not\(h1, h2, h3, h4, h5, h6, \.sl-heading-wrapper\)\s*\+\s*:is\(h1, h2, h3, h4, h5, h6, \.sl-heading-wrapper\):not\(:where\(\.not-content \*\)\)\s*\{[\s\S]*?margin-top:\s*1\.15rem;/,
  );
  assert.match(stylesheetSource, /\.sl-markdown-content > :first-child\s*\{/);
  assert.match(stylesheetSource, /\.sl-markdown-content > :last-child\s*\{/);
  assert.match(
    stylesheetSource,
    /\.sl-markdown-content p,\s*[\r\n]+\s*\.sl-markdown-content ul,\s*[\r\n]+\s*\.sl-markdown-content ol,\s*[\r\n]+\s*\.sl-markdown-content blockquote,\s*[\r\n]+\s*\.sl-markdown-content pre,\s*[\r\n]+\s*\.sl-markdown-content table\s*\{[\s\S]*?margin:\s*0\.8rem 0;/,
  );
  assert.match(stylesheetSource, /\.sl-markdown-content li \+ li\s*\{[\s\S]*?margin-top:\s*0\.25rem;/);
  assert.match(stylesheetSource, /\.sl-markdown-content h2\s*\{[\s\S]*?margin-top:\s*1\.55rem;[\s\S]*?margin-bottom:\s*0\.5rem;/);
  assert.match(stylesheetSource, /\.sl-markdown-content h3\s*\{[\s\S]*?margin-top:\s*1\.2rem;[\s\S]*?margin-bottom:\s*0\.4rem;/);
  assert.match(stylesheetSource, /\.sl-markdown-content h4\s*\{[\s\S]*?margin-top:\s*1rem;[\s\S]*?margin-bottom:\s*0\.35rem;/);
});
