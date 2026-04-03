-- Replay foundation for the source-type registry expected by later storage
-- migrations. Historical migrations 086 and 101 insert into this catalog, but
-- no prior migration creates it, which breaks fresh replay and first-time apply.

create table if not exists public.registry_source_types (
  source_type text not null,
  description text,
  sort_order integer not null default 0,
  constraint registry_source_types_pkey primary key (source_type)
);

insert into public.registry_source_types (source_type, description, sort_order)
values
  ('md', 'Markdown source document', 1),
  ('txt', 'Plain text source document', 2),
  ('docx', 'Microsoft Word source document', 3),
  ('pptx', 'PowerPoint source document', 4),
  ('pdf', 'PDF source document', 5),
  ('html', 'HTML source document', 6),
  ('image', 'Image source document', 7),
  ('asciidoc', 'AsciiDoc source document', 8),
  ('csv', 'CSV source document', 9),
  ('xlsx', 'Excel source document', 10),
  ('xml_uspto', 'USPTO XML source document', 11),
  ('xml_jats', 'JATS XML source document', 12),
  ('mets_gbs', 'Google Books METS source document', 13),
  ('json_docling', 'Docling JSON source document', 14),
  ('audio', 'Audio source document', 15),
  ('vtt', 'VTT transcript source document', 16),
  ('rst', 'reStructuredText source document', 17),
  ('latex', 'LaTeX source document', 18),
  ('odt', 'OpenDocument text source document', 19),
  ('epub', 'EPUB source document', 20),
  ('rtf', 'Rich Text Format source document', 21),
  ('org', 'Org mode source document', 22)
on conflict (source_type) do nothing;
