import ReactMarkdown from 'react-markdown';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';

type Props = {
  title: string;
  markdown: string;
};

function stripLeadingFrontmatter(markdown: string) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

export function PlanDocumentPreview({ title, markdown }: Props) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-background" data-testid="plan-document-preview">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold tracking-tight">Document Surface</h2>
        <p className="mt-2 text-sm text-muted-foreground">{title}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <article className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkFrontmatter, remarkGfm]}>
            {stripLeadingFrontmatter(markdown)}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
