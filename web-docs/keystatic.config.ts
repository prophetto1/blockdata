import { collection, config, fields, singleton } from '@keystatic/core';
import { collectionPaths as _cp, singletonPaths as _sp } from './src/lib/keystatic/routes.mjs';

const collectionPaths = _cp as Record<string, `${string}/*`>;
const singletonPaths = _sp as Record<string, string>;

const sharedMetadata = {
  title: fields.slug({ name: { label: 'Title' } }),
  description: fields.text({
    label: 'Description',
    multiline: true,
  }),
};

function markdownContent(label = 'Content') {
  return fields.mdx({
    label,
    extension: 'md',
  });
}

function mdxContent(label = 'Content') {
  return fields.mdx({
    label,
  });
}

export default config({
  storage: {
    kind: 'local',
  },
  ui: {
    brand: {
      name: 'BlockData CT',
    },
    navigation: {
      Site: ['siteHome', 'gettingStarted'],
      Internal: [
        'internalDocs',
        'styleGuide',
        'contracts',
        'kestraAnalysis',
        'aiAnalysis',
      ],
      Content: [
        'infrastructureDocs',
        'proposals',
      ],
    },
  },
  singletons: {
    siteHome: singleton({
      label: 'Site Home',
      path: singletonPaths.siteHome,
      entryLayout: 'content',
      format: { contentField: 'content' },
      schema: {
        ...sharedMetadata,
        content: mdxContent(),
      },
    }),
    gettingStarted: singleton({
      label: 'Getting Started',
      path: singletonPaths.gettingStarted,
      entryLayout: 'content',
      format: { contentField: 'content' },
      schema: {
        ...sharedMetadata,
        slug: fields.text({
          label: 'Slug',
          defaultValue: 'getting-started',
        }),
        content: markdownContent(),
      },
    }),
  },
  collections: {
    internalDocs: collection({
      label: 'Internal (Top-level)',
      slugField: 'title',
      path: collectionPaths.internalDocs,
      entryLayout: 'content',
      format: { contentField: 'content' },
      schema: {
        ...sharedMetadata,
        content: markdownContent(),
      },
    }),
    styleGuide: collection({
      label: 'Style Guide',
      slugField: 'title',
      path: collectionPaths.styleGuide,
      entryLayout: 'content',
      format: { contentField: 'content' },
      schema: {
        ...sharedMetadata,
        content: mdxContent(),
      },
    }),
    contracts: collection({
      label: 'Contracts',
      slugField: 'title',
      path: collectionPaths.contracts,
      entryLayout: 'content',
      format: { contentField: 'content' },
      schema: {
        ...sharedMetadata,
        content: mdxContent(),
      },
    }),
    kestraAnalysis: collection({
      label: 'Kestra Analysis',
      slugField: 'title',
      path: collectionPaths.kestraAnalysis,
      entryLayout: 'content',
      format: { contentField: 'content' },
      schema: {
        ...sharedMetadata,
        content: markdownContent(),
      },
    }),
    aiAnalysis: collection({
      label: 'AI Analysis',
      slugField: 'title',
      path: collectionPaths.aiAnalysis,
      entryLayout: 'content',
      format: { contentField: 'content' },
      schema: {
        ...sharedMetadata,
        content: mdxContent(),
      },
    }),
    infrastructureDocs: collection({
      label: 'Infrastructure',
      slugField: 'title',
      path: collectionPaths.infrastructureDocs,
      entryLayout: 'content',
      format: { contentField: 'content' },
      schema: {
        ...sharedMetadata,
        content: markdownContent(),
      },
    }),
    proposals: collection({
      label: 'Proposals',
      slugField: 'title',
      path: collectionPaths.proposals,
      entryLayout: 'content',
      format: { contentField: 'content' },
      schema: {
        ...sharedMetadata,
        content: markdownContent(),
      },
    }),
  },
});
