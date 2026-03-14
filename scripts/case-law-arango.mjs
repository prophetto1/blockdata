import fs from 'node:fs/promises';
import path from 'node:path';

function toArangoKey(value) {
  return String(value).replace(/[^0-9A-Za-z_\-:.@()+,=;$!*'%]/g, '_');
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function discoverCaseLawVolumes(rootDir, reporterSlugs) {
  const reporterDirs = await fs.readdir(rootDir, { withFileTypes: true });
  const wanted = new Set((reporterSlugs ?? []).map((slug) => slug.trim()).filter(Boolean));
  const volumes = [];

  for (const reporterDir of reporterDirs) {
    if (!reporterDir.isDirectory()) continue;
    if (wanted.size > 0 && !wanted.has(reporterDir.name)) continue;

    const reporterPath = path.join(rootDir, reporterDir.name);
    const volumeDirs = await fs.readdir(reporterPath, { withFileTypes: true });

    for (const volumeDir of volumeDirs) {
      if (!volumeDir.isDirectory()) continue;

      const volumePath = path.join(reporterPath, volumeDir.name);
      const metadataPath = path.join(volumePath, 'CasesMetadata.json');
      if (!(await exists(metadataPath))) continue;

      volumes.push({
        reporterSlug: reporterDir.name,
        volumeFolder: volumeDir.name,
        volumePath,
        casesMetadataPath: metadataPath,
      });
    }
  }

  return volumes.sort((a, b) =>
    a.reporterSlug.localeCompare(b.reporterSlug) ||
    a.volumeFolder.localeCompare(b.volumeFolder, undefined, { numeric: true }),
  );
}

export function buildVolumeRecord({ reporterSlug, volumeFolder, volumeMetadata, casesMetadataCount }) {
  return {
    _key: toArangoKey(`${reporterSlug}:${volumeFolder}`),
    reporter_slug: reporterSlug,
    volume_number: volumeMetadata?.volume_number ?? volumeFolder,
    volume_folder: volumeFolder,
    volume_id: volumeMetadata?.id ?? null,
    publication_year: volumeMetadata?.publication_year ?? null,
    title: volumeMetadata?.title ?? null,
    publisher: volumeMetadata?.publisher ?? null,
    case_count: casesMetadataCount,
    raw: volumeMetadata ?? {},
  };
}

export function buildCaseRecord({ reporterSlug, volumeFolder, caseJson }) {
  return {
    _key: toArangoKey(caseJson.id),
    case_id: caseJson.id,
    reporter_slug: reporterSlug,
    volume_number: volumeFolder,
    file_name: caseJson.file_name ?? null,
    name: caseJson.name ?? null,
    name_abbreviation: caseJson.name_abbreviation ?? null,
    decision_date: caseJson.decision_date ?? null,
    docket_number: caseJson.docket_number ?? null,
    first_page: caseJson.first_page ?? null,
    last_page: caseJson.last_page ?? null,
    first_page_order: caseJson.first_page_order ?? null,
    last_page_order: caseJson.last_page_order ?? null,
    court: caseJson.court ?? null,
    jurisdiction: caseJson.jurisdiction ?? null,
    citations: caseJson.citations ?? [],
    cites_to: caseJson.cites_to ?? [],
    analysis: caseJson.analysis ?? null,
    provenance: caseJson.provenance ?? null,
    last_updated: caseJson.last_updated ?? null,
    casebody: {
      head_matter: caseJson.casebody?.head_matter ?? null,
      judges: caseJson.casebody?.judges ?? [],
      parties: caseJson.casebody?.parties ?? [],
      attorneys: caseJson.casebody?.attorneys ?? [],
      corrections: caseJson.casebody?.corrections ?? null,
    },
    raw: caseJson,
  };
}

export function buildOpinionRecords({ reporterSlug, volumeFolder, caseJson }) {
  const opinions = caseJson.casebody?.opinions ?? [];
  return opinions.map((opinion, index) => ({
    _key: toArangoKey(`${caseJson.id}:${index}`),
    case_id: caseJson.id,
    reporter_slug: reporterSlug,
    volume_number: volumeFolder,
    opinion_index: index,
    type: opinion.type ?? null,
    author: opinion.author ?? null,
    text: opinion.text ?? '',
  }));
}

function loadArangoConfigFromEnv(env = process.env) {
  return {
    baseUrl: String(env.ARANGO_URL ?? 'http://127.0.0.1:8529').replace(/\/+$/, ''),
    database: env.ARANGO_DATABASE ?? 'blockdata',
    username: env.ARANGO_USERNAME ?? 'root',
    password: env.ARANGO_PASSWORD ?? '',
    volumesCollection: env.ARANGO_CASE_LAW_VOLUMES_COLLECTION ?? 'case_law_volumes',
    casesCollection: env.ARANGO_CASE_LAW_CASES_COLLECTION ?? 'case_law_cases',
    opinionsCollection: env.ARANGO_CASE_LAW_OPINIONS_COLLECTION ?? 'case_law_opinions',
  };
}

async function arangoRequest(config, requestPath, init = {}) {
  return fetch(`${config.baseUrl}/_db/${config.database}${requestPath}`, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

async function ensureCollection(config, name) {
  const response = await arangoRequest(config, '/_api/collection', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

  if (response.ok || response.status === 409) return;

  const body = await response.text().catch(() => '');
  if (body.includes('"errorNum":1207')) return;
  throw new Error(`Arango ensureCollection failed for ${name}: ${response.status} ${body.slice(0, 300)}`);
}

async function replaceDocuments(config, collection, payload) {
  if (payload.length === 0) return;

  const response = await arangoRequest(
    config,
    `/_api/document/${encodeURIComponent(collection)}?overwriteMode=replace`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );

  if (response.ok) return;
  const body = await response.text().catch(() => '');
  throw new Error(`Arango replaceDocuments failed for ${collection}: ${response.status} ${body.slice(0, 300)}`);
}

async function listCaseFiles(volumePath) {
  const casesDir = path.join(volumePath, 'cases');
  if (!(await exists(casesDir))) return [];

  const entries = await fs.readdir(casesDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(casesDir, entry.name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

export async function importCaseLawCorpus({
  rootDir,
  reporterSlugs,
  arangoConfig = loadArangoConfigFromEnv(),
  batchSize = 250,
  dryRun = false,
}) {
  const volumes = await discoverCaseLawVolumes(rootDir, reporterSlugs);
  const summary = {
    volumeCount: volumes.length,
    caseCount: 0,
    opinionCount: 0,
  };

  if (dryRun) {
    return { ...summary, volumes };
  }

  await ensureCollection(arangoConfig, arangoConfig.volumesCollection);
  await ensureCollection(arangoConfig, arangoConfig.casesCollection);
  await ensureCollection(arangoConfig, arangoConfig.opinionsCollection);

  for (const volume of volumes) {
    const volumeMetadataPath = path.join(volume.volumePath, 'VolumeMetadata.json');
    const casesMetadata = await readJson(volume.casesMetadataPath);
    const volumeMetadata = (await exists(volumeMetadataPath))
      ? await readJson(volumeMetadataPath)
      : {
          reporter_slug: volume.reporterSlug,
          volume_number: volume.volumeFolder,
        };

    await replaceDocuments(arangoConfig, arangoConfig.volumesCollection, [
      buildVolumeRecord({
        reporterSlug: volume.reporterSlug,
        volumeFolder: volume.volumeFolder,
        volumeMetadata,
        casesMetadataCount: Array.isArray(casesMetadata) ? casesMetadata.length : 0,
      }),
    ]);

    const caseFiles = await listCaseFiles(volume.volumePath);
    for (let index = 0; index < caseFiles.length; index += batchSize) {
      const batch = caseFiles.slice(index, index + batchSize);
      const casePayload = [];
      const opinionPayload = [];

      for (const filePath of batch) {
        const caseJson = await readJson(filePath);
        casePayload.push(
          buildCaseRecord({
            reporterSlug: volume.reporterSlug,
            volumeFolder: volume.volumeFolder,
            caseJson,
          }),
        );
        opinionPayload.push(
          ...buildOpinionRecords({
            reporterSlug: volume.reporterSlug,
            volumeFolder: volume.volumeFolder,
            caseJson,
          }),
        );
      }

      await replaceDocuments(arangoConfig, arangoConfig.casesCollection, casePayload);
      await replaceDocuments(arangoConfig, arangoConfig.opinionsCollection, opinionPayload);

      summary.caseCount += casePayload.length;
      summary.opinionCount += opinionPayload.length;
    }
  }

  return summary;
}

export function parseReporterSlugs(value) {
  return String(value ?? '')
    .split(',')
    .map((slug) => slug.trim())
    .filter(Boolean);
}
