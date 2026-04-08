import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  buildCaseRecord,
  buildOpinionRecords,
  buildVolumeRecord,
  discoverCaseLawVolumes,
} from './case-law-arango.mjs';

const sampleCase = {
  id: 12577865,
  name: 'KANSAS, petitioner, v. Jeffery SWINDLER.',
  name_abbreviation: 'Kansas v. Swindler',
  decision_date: '2014-01-21',
  docket_number: 'No. 13-52.',
  first_page: '1000',
  last_page: '1000',
  citations: [
    { type: 'official', cite: '134 S. Ct. 1000' },
    { type: 'parallel', cite: '187 L. Ed. 2d 863' },
  ],
  court: {
    id: 9009,
    name: 'Supreme Court of the United States',
    name_abbreviation: 'U.S.',
  },
  jurisdiction: {
    id: 39,
    name: 'U.S.',
    name_long: 'United States',
  },
  cites_to: [
    {
      cite: '296 Kan. 670',
      category: 'reporters:state',
      case_ids: [12417050],
    },
  ],
  analysis: {
    word_count: 47,
    char_count: 283,
  },
  last_updated: '2024-02-27T18:39:14.938427+00:00',
  provenance: {
    source: 'Fastcase',
    batch: '2021',
  },
  casebody: {
    judges: [],
    parties: ['KANSAS, petitioner, v. Jeffery SWINDLER.'],
    attorneys: ['Motion of respondent ... denied.'],
    corrections: '',
    head_matter: 'KANSAS, petitioner...',
    opinions: [
      {
        type: 'majority',
        author: null,
        text: '',
      },
    ],
  },
  file_name: '1000-01',
  first_page_order: 1000,
  last_page_order: 1000,
};

test('discoverCaseLawVolumes finds only requested reporter directories', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'case-law-'));
  const usVolume = path.join(root, 'us', '134');
  const sctVolume = path.join(root, 's-ct', '134');
  const otherVolume = path.join(root, 'kan', '296');

  await fs.mkdir(path.join(usVolume, 'cases'), { recursive: true });
  await fs.mkdir(path.join(sctVolume, 'cases'), { recursive: true });
  await fs.mkdir(path.join(otherVolume, 'cases'), { recursive: true });

  await fs.writeFile(path.join(usVolume, 'CasesMetadata.json'), '[]');
  await fs.writeFile(path.join(sctVolume, 'CasesMetadata.json'), '[]');
  await fs.writeFile(path.join(otherVolume, 'CasesMetadata.json'), '[]');

  const volumes = await discoverCaseLawVolumes(root, ['us', 's-ct']);

  assert.deepEqual(
    volumes.map((volume) => ({
      reporterSlug: volume.reporterSlug,
      volumeFolder: volume.volumeFolder,
    })),
    [
      { reporterSlug: 's-ct', volumeFolder: '134' },
      { reporterSlug: 'us', volumeFolder: '134' },
    ],
  );
});

test('buildVolumeRecord normalizes volume metadata for Arango', () => {
  const record = buildVolumeRecord({
    reporterSlug: 's-ct',
    volumeFolder: '134',
    volumeMetadata: {
      id: 'vol-134',
      volume_number: '134',
      publication_year: 2014,
      reporter_slug: 's-ct',
    },
    casesMetadataCount: 2,
  });

  assert.equal(record._key, 's-ct:134');
  assert.equal(record.reporter_slug, 's-ct');
  assert.equal(record.volume_number, '134');
  assert.equal(record.case_count, 2);
});

test('buildCaseRecord keeps reporter and volume context on each case', () => {
  const record = buildCaseRecord({
    reporterSlug: 's-ct',
    volumeFolder: '134',
    caseJson: sampleCase,
  });

  assert.equal(record._key, '12577865');
  assert.equal(record.reporter_slug, 's-ct');
  assert.equal(record.volume_number, '134');
  assert.equal(record.court.name, 'Supreme Court of the United States');
  assert.equal(record.casebody.head_matter, 'KANSAS, petitioner...');
});

test('buildOpinionRecords creates one opinion document per casebody opinion', () => {
  const records = buildOpinionRecords({
    reporterSlug: 's-ct',
    volumeFolder: '134',
    caseJson: sampleCase,
  });

  assert.equal(records.length, 1);
  assert.equal(records[0]._key, '12577865:0');
  assert.equal(records[0].case_id, 12577865);
  assert.equal(records[0].reporter_slug, 's-ct');
  assert.equal(records[0].type, 'majority');
});
