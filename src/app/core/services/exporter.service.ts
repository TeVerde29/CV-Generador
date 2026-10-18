import { Injectable } from '@angular/core';
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
  TextWrappingType,
  VerticalPositionRelativeFrom,
} from 'docx';
import type { CVData, ExportFormat, PaletteColors } from '../models/cv-data';
import {
  CONTACT_LABELS,
  PROFICIENCY_LABELS,
  PROJECT_LABELS,
  SECTION_TITLES as BASE_SECTION_TITLES,
  safeFileName,
  toHref,
} from '../models/labels';
import type { SectionKey } from '../models/sections';

export interface ExportOptions {
  data: CVData;
  colors: PaletteColors;
  /** Already-rendered CV sheet, used for the PDF (print) path. */
  paperEl?: HTMLElement | null;
  templateName?: string;
  /** Section titles of the active profile; defaults to the neutral ones. */
  titles?: Partial<Record<SectionKey, string>>;
  /** Optional footer line; off unless the user turns it on. */
  watermark?: { enabled: boolean; text: string };
}

export interface ExportResult {
  format: ExportFormat;
  ok: boolean;
  message: string;
}

const hex = (color: string): string => (color || '#000000').replace('#', '').toUpperCase();

@Injectable({ providedIn: 'root' })
export class ExporterService {
  /* ── Public API ──────────────────────────────────────────────────────── */

  async run(format: ExportFormat, opts: ExportOptions): Promise<ExportResult> {
    const name = safeFileName(opts.data.personalInfo.name, 'cv');
    try {
      switch (format) {
        case 'markdown':
          this.exportMarkdown(opts.data, name, opts.watermark, opts.titles);
          return { format, ok: true, message: `Markdown descargado (${name}.md).` };
        case 'docx':
          await this.exportDocx(opts.data, opts.colors, name, opts.watermark, opts.titles);
          return { format, ok: true, message: `Word descargado (${name}.docx).` };
        case 'pdf':
          this.exportPdf(opts.paperEl ?? null, name, opts.data.personalInfo.name);
          return {
            format,
            ok: true,
            message: 'Se abrió el diálogo de impresión: elige «Guardar como PDF».',
          };
        default:
          return { format, ok: false, message: 'Formato no soportado.' };
      }
    } catch (err) {
      return {
        format,
        ok: false,
        message: err instanceof Error ? err.message : 'No se pudo exportar el documento.',
      };
    }
  }

  /* ── Markdown ────────────────────────────────────────────────────────── */

  buildMarkdown(
    cv: CVData,
    watermark?: { enabled: boolean; text: string },
    titles?: Partial<Record<SectionKey, string>>,
  ): string {
    // Local shadow: the body keeps reading `SECTION_TITLES.x`, so a profile can
    // rename the sections without every line of this method changing.
    const SECTION_TITLES = { ...BASE_SECTION_TITLES, ...(titles ?? {}) };
    const out: string[] = [];
    const p = cv.personalInfo;

    if (p.name) out.push(`# ${p.name}`);
    if (p.title) out.push(`**${p.title}**`);

    // Email, phone and city as plain text; the profile links by name, so the
    // header reads "LinkedIn · GitHub" instead of a wall of URLs.
    const contacts = this.contactsOf(p).map((c) =>
      c.href ? `[${c.text}](${toHref(c.href)})` : c.text,
    );
    if (contacts.length) out.push(contacts.join(' · '));

    if (cv.summary) out.push('', `## ${SECTION_TITLES.summary}`, '', cv.summary);

    if (cv.experience.length) {
      out.push('', `## ${SECTION_TITLES.experience}`);
      for (const e of cv.experience) {
        const period = [e.startDate, e.endDate].filter(Boolean).join(' – ');
        out.push('', `### ${[e.position, e.company].filter(Boolean).join(' — ')}`);
        if (period) out.push(`*${period}*`);
        if (e.description) out.push('', e.description);
        for (const a of e.achievements.filter(Boolean)) out.push(`- ${a}`);
      }
    }

    if (cv.education.length) {
      out.push('', `## ${SECTION_TITLES.education}`);
      for (const ed of cv.education) {
        const period = [ed.startDate, ed.endDate].filter(Boolean).join(' – ');
        const degree = [ed.degree, ed.field].filter(Boolean).join(', ');
        out.push('', `### ${[degree, ed.institution].filter(Boolean).join(' — ')}`);
        const meta = [period, ed.gpa ? `Nota: ${ed.gpa}` : ''].filter(Boolean).join(' · ');
        if (meta) out.push(`*${meta}*`);
      }
    }

    if (cv.skills.length) {
      out.push('', `## ${SECTION_TITLES.skills}`);
      for (const s of cv.skills) {
        const items = s.items.filter(Boolean);
        if (items.length) out.push(`- **${s.category}:** ${items.join(', ')}`);
      }
    }

    if (cv.languages.length) {
      out.push('', `## ${SECTION_TITLES.languages}`);
      for (const l of cv.languages) {
        out.push(`- ${l.language} — ${PROFICIENCY_LABELS[l.proficiency] ?? l.proficiency}`);
      }
    }

    if (cv.projects.length) {
      out.push('', `## ${SECTION_TITLES.projects}`);
      for (const pr of cv.projects) {
        out.push('', `### ${pr.name}`);
        if (pr.description) out.push('', pr.description);
        const tech = pr.technologies.filter(Boolean);
        if (tech.length) out.push('', `Tecnologías: ${tech.join(', ')}`);
        const projectLinks = [
          pr.demoUrl ? `[${PROJECT_LABELS.demo}](${toHref(pr.demoUrl)})` : '',
          pr.repoUrl ? `[${PROJECT_LABELS.repo}](${toHref(pr.repoUrl)})` : '',
        ].filter(Boolean);
        if (projectLinks.length) out.push('', projectLinks.join(' · '));
      }
    }

    if (cv.certifications.length) {
      out.push('', `## ${SECTION_TITLES.certifications}`);
      for (const c of cv.certifications) {
        const meta = [c.issuer, c.date].filter(Boolean).join(', ');
        out.push(`- **${c.name}**${meta ? ` — ${meta}` : ''}`);
      }
    }

    if (cv.publications.length) {
      out.push('', `## ${SECTION_TITLES.publications}`);
      for (const pub of cv.publications) {
        const meta = [pub.publisher, pub.date].filter(Boolean).join(', ');
        out.push(`- **${pub.title}**${meta ? ` — ${meta}` : ''}`);
        if (pub.description) out.push(`  ${pub.description}`);
      }
    }

    if (cv.volunteerWork.length) {
      out.push('', `## ${SECTION_TITLES.volunteerWork}`);
      for (const v of cv.volunteerWork) {
        const period = [v.startDate, v.endDate].filter(Boolean).join(' – ');
        out.push(
          '',
          `### ${[v.role, v.organization].filter(Boolean).join(' — ')}`,
        );
        if (period) out.push(`*${period}*`);
        if (v.description) out.push('', v.description);
      }
    }

    if (cv.awards.length) {
      out.push('', `## ${SECTION_TITLES.awards}`);
      for (const a of cv.awards) {
        const meta = [a.issuer, a.date].filter(Boolean).join(', ');
        out.push(`- **${a.title}**${meta ? ` — ${meta}` : ''}`);
      }
    }

    if (cv.interests.length) {
      out.push('', `## ${SECTION_TITLES.interests}`, '', cv.interests.join(' · '));
    }

    if (watermark?.enabled && watermark.text.trim()) {
      out.push('', '---', '', watermark.text.trim());
    }

    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  exportMarkdown(
    cv: CVData,
    name: string,
    watermark?: { enabled: boolean; text: string },
    titles?: Partial<Record<SectionKey, string>>,
  ): void {
    const blob = new Blob([this.buildMarkdown(cv, watermark, titles)], {
      type: 'text/markdown;charset=utf-8',
    });
    this.download(blob, `${name}.md`);
  }

  /** Round-trip format: lets the user back up and restore the whole CV. */
  exportJson(cv: CVData, name: string): void {
    const blob = new Blob([JSON.stringify(cv, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    this.download(blob, `${name}.json`);
  }

  /* ── Word (.docx) ────────────────────────────────────────────────────── */

  async exportDocx(
    cv: CVData,
    colors: PaletteColors,
    name: string,
    watermark?: { enabled: boolean; text: string },
    titles?: Partial<Record<SectionKey, string>>,
  ): Promise<void> {
    const accent = hex(colors.primary);
    const children = this.docxChildren(cv, accent, titles);
    if (watermark?.enabled && watermark.text.trim()) {
      children.push(
        new Paragraph({
          spacing: { before: 340 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: watermark.text.trim(), size: 17, color: '9CA3AF' })],
        }),
      );
    }
    const doc = new Document({
      creator: cv.personalInfo.name || 'CV',
      title: `CV — ${cv.personalInfo.name}`,
      description: 'Currículum generado con CV-Generador',
      styles: {
        default: {
          document: { run: { font: 'Calibri', size: 21 }, paragraph: { spacing: { line: 276 } } },
        },
      },
      sections: [
        {
          properties: {
            page: {
              margin: { top: 850, right: 850, bottom: 850, left: 850 },
            },
          },
          children,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    this.download(blob, `${name}.docx`);
  }

  /**
   * The header line, as parts. Email, phone and city are text; the profile
   * links are name + target, so the exports can render them as real hyperlinks
   * ("LinkedIn") instead of pasting the raw URL.
   */
  private contactsOf(p: CVData['personalInfo']): { text: string; href?: string }[] {
    const out: { text: string; href?: string }[] = [];
    for (const value of [p.email, p.phone, p.location]) {
      if (value?.trim()) out.push({ text: value.trim() });
    }
    const links: [string, string | undefined][] = [
      [CONTACT_LABELS.website, p.website],
      [CONTACT_LABELS.linkedin, p.linkedin],
      [CONTACT_LABELS.github, p.github],
      [CONTACT_LABELS.portfolio, p.portfolio],
    ];
    for (const [label, url] of links) {
      if (url?.trim()) out.push({ text: label, href: url.trim() });
    }
    return out;
  }

  private sectionHeading(text: string, accent: string): Paragraph {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 280, after: 110 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: 'D8D8DA', space: 4 },
      },
      children: [
        new TextRun({ text: text.toUpperCase(), bold: true, size: 19, color: accent, characterSpacing: 12 }),
      ],
    });
  }

  /** Decodes the base64 payload of a data URL into bytes for `docx`. */
  private decodeBase64(payload: string): Uint8Array {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  /**
   * The optional portrait, floated to the right of the header so the name and
   * the contact line keep their reading order for ATS parsers.
   */
  private photoRun(photo: string): ImageRun | null {
    const match = /^data:image\/(png|jpeg|jpg|gif);base64,(.+)$/i.exec(photo.trim());
    if (!match) return null;
    const kind = match[1].toLowerCase();
    const type = kind === 'png' ? 'png' : kind === 'gif' ? 'gif' : 'jpg';
    try {
      return new ImageRun({
        type,
        data: this.decodeBase64(match[2]),
        transformation: { width: 96, height: 96 },
        floating: {
          horizontalPosition: {
            relative: HorizontalPositionRelativeFrom.MARGIN,
            align: HorizontalPositionAlign.RIGHT,
          },
          verticalPosition: { relative: VerticalPositionRelativeFrom.MARGIN, offset: 0 },
          wrap: { type: TextWrappingType.SQUARE },
          margins: { left: 190500 },
        },
      });
    } catch {
      return null;
    }
  }

  private docxChildren(
    cv: CVData,
    accent: string,
    titles?: Partial<Record<SectionKey, string>>,
  ): Paragraph[] {
    // Same shadow trick as the Markdown builder: profiles rename sections
    // without every line below having to change.
    const SECTION_TITLES = { ...BASE_SECTION_TITLES, ...(titles ?? {}) };
    const nodes: Paragraph[] = [];
    const p = cv.personalInfo;

    const photo = p.photo ? this.photoRun(p.photo) : null;
    if (photo) {
      nodes.push(new Paragraph({ spacing: { after: 0 }, children: [photo] }));
    }

    if (p.name) {
      nodes.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: p.name, bold: true, size: 42, color: accent })],
        }),
      );
    }

    if (p.title) {
      nodes.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: p.title, size: 24, color: '52525B' })],
        }),
      );
    }

    // Contact line, joined with a middle dot. Email, phone and city stay as
    // plain text (that is what an ATS reads); the profile links carry their
    // name and stay clickable in Word.
    const contactRuns: (TextRun | ExternalHyperlink)[] = [];
    for (const c of this.contactsOf(p)) {
      if (contactRuns.length) {
        contactRuns.push(new TextRun({ text: '  ·  ', size: 19, color: '71717A' }));
      }
      contactRuns.push(
        c.href
          ? new ExternalHyperlink({
              link: toHref(c.href),
              children: [new TextRun({ text: c.text, size: 19, color: accent, underline: {} })],
            })
          : new TextRun({ text: c.text, size: 19, color: '71717A' }),
      );
    }
    if (contactRuns.length) {
      nodes.push(new Paragraph({ spacing: { after: 60 }, children: contactRuns }));
    }

    if (cv.summary) {
      nodes.push(this.sectionHeading(SECTION_TITLES.summary, accent));
      nodes.push(new Paragraph({ children: [new TextRun({ text: cv.summary, size: 21 })] }));
    }

    if (cv.experience.length) {
      nodes.push(this.sectionHeading(SECTION_TITLES.experience, accent));
      for (const e of cv.experience) {
        const period = [e.startDate, e.endDate].filter(Boolean).join(' – ');
        nodes.push(
          new Paragraph({
            spacing: { before: 120, after: 0 },
            children: [
              new TextRun({ text: e.position || '', bold: true, size: 22 }),
              ...(e.company ? [new TextRun({ text: `  ·  ${e.company}`, size: 22 })] : []),
            ],
          }),
        );
        if (period) {
          nodes.push(
            new Paragraph({
              spacing: { after: 60 },
              children: [
                new TextRun({ text: period, italics: true, size: 19, color: '71717A' }),
              ],
            }),
          );
        }
        if (e.description) {
          nodes.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [new TextRun({ text: e.description, size: 21 })],
            }),
          );
        }
        for (const a of e.achievements.filter(Boolean)) {
          nodes.push(new Paragraph({ text: a, bullet: { level: 0 }, spacing: { after: 20 } }));
        }
      }
    }

    if (cv.education.length) {
      nodes.push(this.sectionHeading(SECTION_TITLES.education, accent));
      for (const ed of cv.education) {
        const period = [ed.startDate, ed.endDate].filter(Boolean).join(' – ');
        const degree = [ed.degree, ed.field].filter(Boolean).join(', ');
        nodes.push(
          new Paragraph({
            spacing: { before: 120, after: 0 },
            children: [
              new TextRun({ text: degree || '', bold: true, size: 22 }),
              ...(ed.institution ? [new TextRun({ text: `  ·  ${ed.institution}`, size: 22 })] : []),
            ],
          }),
        );
        const meta = [period, ed.gpa ? `Nota: ${ed.gpa}` : ''].filter(Boolean).join('  ·  ');
        if (meta) {
          nodes.push(
            new Paragraph({
              spacing: { after: 60 },
              children: [new TextRun({ text: meta, italics: true, size: 19, color: '71717A' })],
            }),
          );
        }
      }
    }

    if (cv.skills.length) {
      nodes.push(this.sectionHeading(SECTION_TITLES.skills, accent));
      for (const s of cv.skills) {
        const items = s.items.filter(Boolean).join(', ');
        if (!items) continue;
        nodes.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: `${s.category}: `, bold: true, size: 21 }),
              new TextRun({ text: items, size: 21 }),
            ],
          }),
        );
      }
    }

    if (cv.languages.length) {
      nodes.push(this.sectionHeading(SECTION_TITLES.languages, accent));
      for (const l of cv.languages) {
        nodes.push(
          new Paragraph({
            text: `${l.language} — ${PROFICIENCY_LABELS[l.proficiency] ?? l.proficiency}`,
            bullet: { level: 0 },
            spacing: { after: 20 },
          }),
        );
      }
    }

    if (cv.projects.length) {
      nodes.push(this.sectionHeading(SECTION_TITLES.projects, accent));
      for (const pr of cv.projects) {
        nodes.push(
          new Paragraph({
            spacing: { before: 120, after: 0 },
            children: [new TextRun({ text: pr.name || '', bold: true, size: 22 })],
          }),
        );
        if (pr.description) {
          nodes.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [new TextRun({ text: pr.description, size: 21 })],
            }),
          );
        }
        const tech = pr.technologies.filter(Boolean).join(', ');
        if (tech) {
          nodes.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({ text: 'Tecnologías: ', bold: true, size: 19 }),
                new TextRun({ text: tech, size: 19, color: '52525B' }),
              ],
            }),
          );
        }
        const projectLinks: { label: string; url: string }[] = [];
        if (pr.demoUrl) projectLinks.push({ label: PROJECT_LABELS.demo, url: pr.demoUrl });
        if (pr.repoUrl) projectLinks.push({ label: PROJECT_LABELS.repo, url: pr.repoUrl });
        if (projectLinks.length) {
          const runs: (TextRun | ExternalHyperlink)[] = [];
          for (const link of projectLinks) {
            if (runs.length) runs.push(new TextRun({ text: '  ·  ', size: 19, color: '71717A' }));
            runs.push(
              new ExternalHyperlink({
                link: toHref(link.url),
                children: [
                  new TextRun({ text: link.label, size: 19, color: accent, underline: {} }),
                ],
              }),
            );
          }
          nodes.push(new Paragraph({ spacing: { after: 40 }, children: runs }));
        }
      }
    }

    if (cv.certifications.length) {
      nodes.push(this.sectionHeading(SECTION_TITLES.certifications, accent));
      for (const c of cv.certifications) {
        const meta = [c.issuer, c.date].filter(Boolean).join(', ');
        nodes.push(
          new Paragraph({
            spacing: { after: 20 },
            children: [
              new TextRun({ text: c.name, bold: true, size: 21 }),
              ...(meta ? [new TextRun({ text: ` — ${meta}`, size: 21 })] : []),
            ],
          }),
        );
      }
    }

    if (cv.publications.length) {
      nodes.push(this.sectionHeading(SECTION_TITLES.publications, accent));
      for (const pub of cv.publications) {
        const meta = [pub.publisher, pub.date].filter(Boolean).join(', ');
        nodes.push(
          new Paragraph({
            spacing: { after: 20 },
            children: [
              new TextRun({ text: pub.title, bold: true, size: 21 }),
              ...(meta ? [new TextRun({ text: ` — ${meta}`, size: 21 })] : []),
            ],
          }),
        );
        if (pub.description) {
          nodes.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [new TextRun({ text: pub.description, size: 19, color: '52525B' })],
            }),
          );
        }
      }
    }

    if (cv.volunteerWork.length) {
      nodes.push(this.sectionHeading(SECTION_TITLES.volunteerWork, accent));
      for (const v of cv.volunteerWork) {
        const period = [v.startDate, v.endDate].filter(Boolean).join(' – ');
        nodes.push(
          new Paragraph({
            spacing: { before: 120, after: 0 },
            children: [
              new TextRun({ text: v.role || '', bold: true, size: 22 }),
              ...(v.organization ? [new TextRun({ text: `  ·  ${v.organization}`, size: 22 })] : []),
            ],
          }),
        );
        if (period) {
          nodes.push(
            new Paragraph({
              spacing: { after: 60 },
              children: [new TextRun({ text: period, italics: true, size: 19, color: '71717A' })],
            }),
          );
        }
        if (v.description) {
          nodes.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [new TextRun({ text: v.description, size: 21 })],
            }),
          );
        }
      }
    }

    if (cv.awards.length) {
      nodes.push(this.sectionHeading(SECTION_TITLES.awards, accent));
      for (const a of cv.awards) {
        const meta = [a.issuer, a.date].filter(Boolean).join(', ');
        nodes.push(
          new Paragraph({
            spacing: { after: 20 },
            children: [
              new TextRun({ text: a.title, bold: true, size: 21 }),
              ...(meta ? [new TextRun({ text: ` — ${meta}`, size: 21 })] : []),
            ],
          }),
        );
      }
    }

    if (cv.interests.length) {
      nodes.push(this.sectionHeading(SECTION_TITLES.interests, accent));
      nodes.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [new TextRun({ text: cv.interests.join('  ·  '), size: 21 })],
        }),
      );
    }

    if (!nodes.length) {
      nodes.push(new Paragraph({ children: [new TextRun({ text: 'CV vacío', size: 21 })] }));
    }

    return nodes;
  }

  /* ── PDF (browser print → save as PDF) ───────────────────────────────── */

  /**
   * Opens the rendered sheet in a clean window and triggers the print dialog.
   * The browser produces a vector PDF that matches the preview exactly, and
   * lets the user pick "Save as PDF" without shipping a PDF library.
   */
  exportPdf(paperEl: HTMLElement | null, name: string, personName: string): void {
    if (!paperEl) throw new Error('El lienzo del CV todavía no está listo.');

    const win = window.open('', '_blank', 'width=920,height=1180');
    if (!win) {
      throw new Error('El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes.');
    }

    const styles = this.collectStyles();
    const title = safeFileName(personName, 'cv');
    // The new window starts at about:blank, so relative URLs (the self-hosted
    // fonts, for instance) would not resolve. Mirroring the current base URI
    // keeps every referenced asset reachable.
    const base = document.baseURI;

    win.document.open();
    win.document.write(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<base href="${base}" />
<title>${title}</title>
${styles}
<style>
  html, body { margin: 0 !important; padding: 0 !important; background: #ffffff !important; }
  body { display: block !important; }
  .print-root { margin: 0 auto; }
  .cv-sheet, .cv-sheet * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .cv-sheet { box-shadow: none !important; border: 0 !important; margin: 0 !important; }
  .cv-section, .cv-item, .cv-entry { break-inside: avoid; page-break-inside: avoid; }
  .cv-section-heading { break-after: avoid; page-break-after: avoid; }
  @page { size: A4; margin: 0; }
</style>
</head>
<body><div class="print-root">${paperEl.outerHTML}</div>
<script>
  /* Print from inside the document so we can wait for fonts to settle: firing
     too early would bake a fallback typeface into the PDF. There is a safety
     timeout and a latch, so the dialog always opens exactly once. */
  (function () {
    var fired = false;
    function go() {
      if (fired) return;
      fired = true;
      setTimeout(function () {
        try { window.focus(); window.print(); } catch (e) { /* the user can print from the window */ }
      }, 100);
    }
    function whenLoadedAndReady(fn) {
      var pending = 2;
      function one() { if (--pending <= 0) fn(); }
      if (document.readyState === 'complete') one();
      else window.addEventListener('load', one, { once: true });
      if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
        document.fonts.ready.then(one, one);
      } else { one(); }
    }
    whenLoadedAndReady(go);
    setTimeout(go, 2500);
  })();
</script>
</body>
</html>`);
    win.document.close();
  }

  /** Copies every stylesheet currently applied so the print window matches. */
  private collectStyles(): string {
    const parts: string[] = [];
    document.querySelectorAll('style').forEach((el) => {
      parts.push(`<style>${el.textContent ?? ''}</style>`);
    });
    document.querySelectorAll('link[rel="stylesheet"]').forEach((el) => {
      parts.push(el.outerHTML);
    });
    return parts.join('\n');
  }

  /* ── Helpers ─────────────────────────────────────────────────────────── */

  private download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}
