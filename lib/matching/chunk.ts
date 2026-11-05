import type { Section } from './types';

const MAX_CHARS = 800;
const FLUSH_AT_BLANK = 200;
const CONTACT_LINES = 3;

const HEADERS: [RegExp, Section][] = [
  [/^(technical |core |key )?skills$|^technologies$|^tech stack$|^core competencies$/, 'skills'],
  [/^(work |professional |relevant )?experience$|^employment( history)?$|^(work|career) history$/, 'experience'],
  [/^(personal |academic |key |selected )?projects$/, 'project'],
  [/^education$|^academic (background|qualifications)$|^qualifications$/, 'education'],
  [/^certifications?$|^licenses?( and certifications)?$|^courses$/, 'certification'],
  [/^(professional )?summary$|^profile$|^objective$|^about( me)?$/, 'summary'],
];

function headerSection(line: string): Section | null {
  const clean = line.toLowerCase().replace(/[^a-z& ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean || clean.length > 40) return null;
  return HEADERS.find(([pattern]) => pattern.test(clean))?.[1] ?? null;
}

export interface RawChunk {
  section: Section;
  ordinal: number;
  content: string;
  startOffset: number;
}

export function chunkResume(raw: string): RawChunk[] {
  const chunks: RawChunk[] = [];
  let buffer: string[] = [];
  let bufferStart = 0;
  let section: Section = 'contact';
  let offset = 0;
  let lineIndex = 0;

  const flush = () => {
    const content = buffer.join('\n').trim();
    if (content) chunks.push({ section, ordinal: chunks.length, content, startOffset: bufferStart });
    buffer = [];
  };

  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trim();
    const header = headerSection(line);

    if (header) {
      flush();
      section = header;
    } else if (section === 'contact' && line && lineIndex >= CONTACT_LINES) {
      // Text after the contact block with no header must stay searchable.
      flush();
      section = 'other';
    }

    if (!header) {
      if (!line) {
        if (buffer.join('\n').length >= FLUSH_AT_BLANK) flush();
      } else {
        if (buffer.join('\n').length + line.length + 1 > MAX_CHARS) flush();
        if (buffer.length === 0) bufferStart = offset + rawLine.indexOf(line);
        buffer.push(line);
      }
    }

    if (line) lineIndex += 1;
    offset += rawLine.length + 1;
  }
  flush();
  return chunks;
}
