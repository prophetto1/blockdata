import { collection, config, fields } from '@keystatic/core';

const sharedSchema = {
  title: fields.slug({ name: { label: 'Title' } }),
  description: fields.text({
    label: 'Description',
    multiline: true,
  }),
};

export default config({
  storage: {
    kind: 'local',
  },
  collections: {
    docsMarkdown: collection({
      label: 'Docs (Markdown)',
      slugField: 'title',
      path: 'src/content/docs/**/*.md',
      entryLayout: 'content',
      format: { contentField: 'content' },
      schema: {
        ...sharedSchema,
        content: fields.mdx({
          label: 'Content',
          extension: 'md',
        }),
      },
    }),
    docsMdx: collection({
      label: 'Docs (MDX)',
      slugField: 'title',
      path: 'src/content/docs/**/*.mdx',
      entryLayout: 'content',
      format: { contentField: 'content' },
      schema: {
        ...sharedSchema,
        content: fields.mdx({
          label: 'Content',
        }),
      },
    }),
  },
});
