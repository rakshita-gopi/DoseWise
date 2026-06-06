type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] };

function cleanMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .trim();
}

function isTableSeparator(line: string) {
  const t = line.trim();
  return /^\|?[\s:|-]+\|[\s|:-]*$/.test(t) || /^[-|:\s]+$/.test(t);
}

function splitPipeRow(line: string): string[] | null {
  if (!line.includes('|')) return null;
  const cells = line
    .split('|')
    .map((c) => c.trim())
    .filter((c, i, arr) => !(i === 0 && c === '') && !(i === arr.length - 1 && c === ''));
  return cells.length >= 2 ? cells : null;
}

function isDaysValue(text: string) {
  return /^\d+\s*days?(\s*left)?\.?$/i.test(text.trim()) || /^\d+\s*days?\s+remaining/i.test(text.trim());
}

function parseInlineMedDays(line: string): [string, string] | null {
  const patterns = [
    /^(.+?)\s*[-–—:]\s*(\d+\s*days?.*)$/i,
    /^(.+?)\s+(\d+\s*days?\s*left.*)$/i,
  ];
  for (const p of patterns) {
    const m = line.match(p);
    if (m) return [m[1].trim(), m[2].trim()];
  }
  return null;
}

function looksLikeMedicine(line: string) {
  const t = line.trim();
  if (!t || isDaysValue(t)) return false;
  return (
    /^TAB\./i.test(t) ||
    /^CAP\./i.test(t) ||
    /^INJ\./i.test(t) ||
    /^SYP\./i.test(t) ||
    /^[A-Z][A-Z0-9.\s-]{2,}$/.test(t)
  );
}

function tryParsePipeTable(lines: string[], start: number): { block: Block; next: number } | null {
  const headerCells = splitPipeRow(lines[start]);
  if (!headerCells) return null;

  let i = start + 1;
  if (i < lines.length && isTableSeparator(lines[i])) i++;

  const rows: string[][] = [];
  while (i < lines.length) {
    const cells = splitPipeRow(lines[i]);
    if (!cells) break;
    rows.push(cells);
    i++;
  }

  if (rows.length === 0) return null;
  return { block: { type: 'table', headers: headerCells, rows }, next: i };
}

function tryParseAlternatingPairs(lines: string[], start: number): { block: Block; next: number } | null {
  const rows: string[][] = [];
  let i = start;

  while (i + 1 < lines.length) {
    const name = lines[i].trim();
    const days = lines[i + 1].trim();
    if (!looksLikeMedicine(name) || !isDaysValue(days)) break;
    rows.push([name, days.replace(/\s*left\.?$/i, '').trim() || days]);
    i += 2;
    while (i < lines.length && !lines[i].trim()) i++;
  }

  if (rows.length < 2) return null;
  return {
    block: { type: 'table', headers: ['Medicine', 'Days Left'], rows },
    next: i,
  };
}

function tryParseInlineList(lines: string[], start: number): { block: Block; next: number } | null {
  const rows: string[][] = [];
  let i = start;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) break;
    const pair = parseInlineMedDays(line);
    if (!pair) break;
    rows.push(pair);
    i++;
  }

  if (rows.length < 2) return null;
  return {
    block: { type: 'table', headers: ['Medicine', 'Days Left'], rows },
    next: i,
  };
}

function tryParseNumberedList(lines: string[], start: number): { block: Block; next: number } | null {
  const rows: string[][] = [];
  let i = start;

  while (i < lines.length) {
    const m = lines[i].trim().match(/^\d+\.\s+(.+)$/);
    if (!m) break;
    const pair = parseInlineMedDays(m[1]) || m[1].split(/\s*[-–—]\s+/).length >= 2
      ? [m[1].split(/\s*[-–—]\s+/)[0].trim(), m[1].split(/\s*[-–—]\s+/).slice(1).join(' - ').trim()] as [string, string]
      : null;
    if (pair) rows.push(pair);
    else rows.push(['', m[1]]);
    i++;
  }

  if (rows.length < 2) return null;
  return {
    block: { type: 'table', headers: ['Medicine', 'Days Left'], rows },
    next: i,
  };
}

function parseBlocks(content: string): Block[] {
  const text = cleanMarkdown(content);
  const lines = text.split('\n').map((l) => l.trim());
  const blocks: Block[] = [];
  let i = 0;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    const joined = paragraph.join(' ').trim();
    if (joined) blocks.push({ type: 'paragraph', text: joined });
    paragraph = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line) {
      flushParagraph();
      i++;
      continue;
    }

    const pipeTable = tryParsePipeTable(lines, i);
    if (pipeTable) {
      flushParagraph();
      blocks.push(pipeTable.block);
      i = pipeTable.next;
      continue;
    }

    const numbered = line.match(/^\d+\.\s+/);
    if (numbered) {
      const list = tryParseNumberedList(lines, i);
      if (list) {
        flushParagraph();
        blocks.push(list.block);
        i = list.next;
        continue;
      }
    }

    const inlineList = tryParseInlineList(lines, i);
    if (inlineList) {
      flushParagraph();
      blocks.push(inlineList.block);
      i = inlineList.next;
      continue;
    }

    const altPairs = tryParseAlternatingPairs(lines, i);
    if (altPairs) {
      flushParagraph();
      blocks.push(altPairs.block);
      i = altPairs.next;
      continue;
    }

    const singleInline = parseInlineMedDays(line);
    if (singleInline) {
      flushParagraph();
      const rows: string[][] = [singleInline];
      i++;
      while (i < lines.length) {
        const pair = parseInlineMedDays(lines[i]);
        if (!pair) break;
        rows.push(pair);
        i++;
      }
      if (rows.length >= 1) {
        blocks.push({ type: 'table', headers: ['Medicine', 'Days Left'], rows });
        continue;
      }
    }

    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    const isHeading =
      !line.endsWith('.') &&
      line.length < 60 &&
      !line.includes('|') &&
      (tryParsePipeTable(lines, i + 1) ||
        tryParseAlternatingPairs(lines, i + 1) ||
        tryParseInlineList(lines, i + 1) ||
        nextLine.match(/^\d+\./) ||
        /inventory|medicine|schedule|adherence|summary/i.test(line));

    if (isHeading && !looksLikeMedicine(line)) {
      flushParagraph();
      blocks.push({ type: 'heading', text: line.replace(/:$/, '') });
      i++;
      continue;
    }

    paragraph.push(line);
    i++;
  }

  flushParagraph();

  if (blocks.length === 1 && blocks[0].type === 'paragraph') {
    const fallback = tryParseInventoryFromParagraph(blocks[0].text);
    if (fallback) return fallback;
  }

  return blocks;
}

function tryParseInventoryFromParagraph(text: string): Block[] | null {
  const parts = text.split(/,\s*(?=TAB\.|CAP\.|CARCA|[A-Z]{3,})/i);
  if (parts.length < 3) return null;

  const rows: string[][] = [];
  for (const part of parts) {
    const pair = parseInlineMedDays(part.trim());
    if (pair) rows.push(pair);
  }

  if (rows.length < 3) return null;
  return [
    { type: 'heading', text: 'Medicine Inventory' },
    { type: 'table', headers: ['Medicine', 'Days Left'], rows },
  ];
}

export function JegoMessage({ content }: { content: string }) {
  const blocks = parseBlocks(content);

  if (blocks.length === 0) {
    return <p className="whitespace-pre-wrap text-sm">{cleanMarkdown(content)}</p>;
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          return (
            <h3
              key={idx}
              className="border-b border-slate-200/80 pb-1.5 font-display text-sm font-semibold text-brand-700 dark:border-slate-600 dark:text-brand-300"
            >
              {block.text}
            </h3>
          );
        }

        if (block.type === 'paragraph') {
          return (
            <p key={idx} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {block.text}
            </p>
          );
        }

        const cols = Math.max(block.headers.length, ...block.rows.map((r) => r.length));
        const headers = block.headers.length ? block.headers : Array.from({ length: cols }, (_, ci) => `Column ${ci + 1}`);

        return (
          <div key={idx} className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-600/80">
            <table className="w-full min-w-[260px] text-left text-xs">
              <thead>
                <tr className="bg-brand-50/80 dark:bg-brand-950/40">
                  {headers.map((h, hi) => (
                    <th
                      key={hi}
                      className="whitespace-nowrap px-3 py-2.5 font-semibold uppercase tracking-wide text-brand-800 dark:text-brand-200"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, ri) => (
                  <tr
                    key={ri}
                    className={ri % 2 === 0 ? 'bg-white dark:bg-slate-800/50' : 'bg-slate-50/80 dark:bg-slate-800/30'}
                  >
                    {headers.map((_, ci) => (
                      <td key={ci} className="px-3 py-2 text-slate-700 dark:text-slate-300">
                        {row[ci] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

export function stripAsterisks(text: string) {
  return cleanMarkdown(text);
}
