import { Fragment, useMemo, useState } from 'react';
import { Check, Code2, Copy, PanelLeftOpen } from 'lucide-react';
import { parseMarkdownBlocks } from '../utils/orchestratorUtils';

interface RichMarkdownProps {
  content: string;
  onOpenCodeCanvas?: (payload: { language: string; code: string; title: string }) => void;
  onToast?: (msg: string) => void;
}

function renderInline(text: string) {
  // Tokenize bold (**...**), inline code (`...`), links ([label](url)), italic (*...*)
  const pattern =
    /(\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*[^*\n]+\*)/g;
  const parts = text.split(pattern);

  return parts.map((part, idx) => {
    if (!part) return null;

    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-extrabold text-[#F8F0DC]">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          dir="ltr"
          className="mx-0.5 inline-block rounded border border-[#D9A441]/25 bg-[#1B150E] px-1.5 py-0.5 font-mono text-[12px] text-[#EFC872]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={idx}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#E2B454] underline decoration-[#D9A441]/50 underline-offset-4 transition-colors hover:text-[#F8DC94]"
        >
          {linkMatch[1]}
        </a>
      );
    }

    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={idx} className="italic text-[#E4D7BE]">
          {part.slice(1, -1)}
        </em>
      );
    }

    return <Fragment key={idx}>{part}</Fragment>;
  });
}

function MarkdownCodeBlock({
  language,
  code,
  onOpenCodeCanvas,
  onToast,
}: {
  language: string;
  code: string;
  onOpenCodeCanvas?: (payload: { language: string; code: string; title: string }) => void;
  onToast?: (msg: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const isPreviewable =
    language === 'html' ||
    language === 'svg' ||
    /^\s*(<!doctype|<html|<svg)/i.test(code);

  const label =
    language === 'html'
      ? 'تطبيق ويب HTML'
      : language === 'svg'
      ? 'تصميم SVG فني'
      : language.toUpperCase() || 'CODE';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      onToast?.('تم نسخ الكود');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      onToast?.('تعذّر النسخ');
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-[#D9A441]/28 bg-[#0D0A07]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D9A441]/18 bg-[#17120D] px-3 py-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#E6BC66]">
          <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {onOpenCodeCanvas && (
            <button
              type="button"
              onClick={() =>
                onOpenCodeCanvas({
                  language: isPreviewable && language === 'text' ? 'html' : language,
                  code,
                  title: isPreviewable
                    ? language === 'svg'
                      ? 'بوستر وتصميم SVG'
                      : 'معاينة تطبيق تفاعلي حي'
                    : `ملف برمجي (${language || 'code'})`,
                })
              }
              className="inline-flex items-center gap-1 rounded-md border border-[#D9A441]/45 bg-[#D9A441]/14 px-2 py-1 text-[11px] font-bold text-[#F0C975] transition-colors hover:bg-[#D9A441] hover:text-[#0B0907]"
            >
              <PanelLeftOpen className="h-3 w-3" aria-hidden="true" />
              <span>{isPreviewable ? 'فتح المعاينة الحيّة' : 'فتح في اللوحة'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-md border border-[#D9A441]/22 bg-[#1E1811] px-2 py-1 text-[11px] font-bold text-[#EDE3CC] hover:border-[#D9A441]/55"
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
            ) : (
              <Copy className="h-3 w-3" aria-hidden="true" />
            )}
            <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
          </button>
        </div>
      </div>
      <pre
        dir="ltr"
        className="max-h-[340px] overflow-auto p-3.5 text-left font-mono text-xs leading-relaxed text-[#EFE6D2]"
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function RichMarkdown({
  content,
  onOpenCodeCanvas,
  onToast,
}: RichMarkdownProps) {
  const blocks = useMemo(() => parseMarkdownBlocks(content), [content]);

  if (blocks.length === 0) return null;

  return (
    <div className="space-y-3 text-sm leading-[1.82] text-[#EFE5D1]">
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          if (block.level === 1) {
            return (
              <h2
                key={idx}
                className="font-calligraphy border-b border-[#D9A441]/25 pb-1.5 pt-1 text-xl font-bold text-[#F8EFDA] sm:text-2xl"
              >
                {renderInline(block.text)}
              </h2>
            );
          }
          if (block.level === 2) {
            return (
              <h3
                key={idx}
                className="font-calligraphy pt-2 text-lg font-bold text-[#F0C975] sm:text-xl"
              >
                {renderInline(block.text)}
              </h3>
            );
          }
          return (
            <h4
              key={idx}
              className="pt-1 text-base font-extrabold text-[#F4E9D2]"
            >
              {renderInline(block.text)}
            </h4>
          );
        }

        if (block.type === 'hr') {
          return (
            <hr
              key={idx}
              className="my-3 border-t border-dashed border-[#D9A441]/25"
            />
          );
        }

        if (block.type === 'blockquote') {
          return (
            <blockquote
              key={idx}
              className="my-2 rounded-lg border border-[#D9A441]/22 bg-[#1A140E]/90 px-4 py-3 font-calligraphy text-base italic leading-relaxed text-[#E7D8BA]"
            >
              {block.text.split('\n').map((line, lIdx) => (
                <p key={lIdx}>{renderInline(line)}</p>
              ))}
            </blockquote>
          );
        }

        if (block.type === 'ul') {
          return (
            <ul key={idx} className="space-y-1.5 pr-4">
              {block.items.map((item, iIdx) => (
                <li key={iIdx} className="relative flex items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className="mt-2.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-[#D9A441]"
                  />
                  <span className="flex-1">{renderInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === 'ol') {
          return (
            <ol key={idx} className="space-y-1.5 pr-1">
              {block.items.map((item, iIdx) => (
                <li key={iIdx} className="flex items-start gap-2.5">
                  <span className="font-mono-tabular mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[#D9A441]/35 bg-[#1B150E] text-[11px] font-bold text-[#E6BC66]">
                    {iIdx + 1}
                  </span>
                  <span className="flex-1">{renderInline(item)}</span>
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === 'table') {
          return (
            <div
              key={idx}
              className="my-3 overflow-x-auto rounded-xl border border-[#D9A441]/25 bg-[#120E0A]"
            >
              <table className="w-full border-collapse text-right text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#D9A441]/25 bg-[#1C160F] text-[#F0C975]">
                    {block.headers.map((h, hIdx) => (
                      <th key={hIdx} className="px-3 py-2.5 font-extrabold">
                        {renderInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9A441]/12">
                  {block.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="transition-colors hover:bg-[#1A140E]"
                    >
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 text-[#EAE0CC]">
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === 'code') {
          return (
            <MarkdownCodeBlock
              key={idx}
              language={block.language}
              code={block.code}
              onOpenCodeCanvas={onOpenCodeCanvas}
              onToast={onToast}
            />
          );
        }

        return (
          <p key={idx} className="whitespace-pre-line text-[#EFE5D1]">
            {block.text.split('\n').map((line, lIdx, arr) => (
              <Fragment key={lIdx}>
                {renderInline(line)}
                {lIdx < arr.length - 1 && <br />}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
