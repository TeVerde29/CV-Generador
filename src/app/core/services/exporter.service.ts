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
  TabStopType,
  TextRun,
  TextWrappingType,
  VerticalPositionRelativeFrom,
} from 'docx';
import { DEFAULT_LAYOUT_ID, DEFAULT_TEMPLATE_ID } from '../models/catalog';
import type { CVData, ExportFormat, PaletteColors } from '../models/cv-data';
import {
  CONTACT_LABELS,
  PROFICIENCY_LABELS,
  PROJECT_LABELS,
  SECTION_TITLES as BASE_SECTION_TITLES,
  safeFileName,
  toHref,
} from '../models/labels';
import { DEFAULT_SECTION_ORDER, documentOrder, type SectionKey } from '../models/sections';
import { docxLook, type DocxLook } from './docx-look';

/** What the user picked in the design tab; the exports follow it too. */
export interface ExportDesign {
  templateId: string;
  layoutId: string;
  sectionOrder: SectionKey[];
}

/** A link of the rendered sheet, measured in raster pixels. */
interface RasterLink {
  url: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ExportOptions {
  data: CVData;
  colors: PaletteColors;
  /** The rendered CV sheet, which is what the PDF is built from. */
  paperEl?: HTMLElement | null;
  templateName?: string;
  /** Section titles of the active profile; defaults to the neutral ones. */
  titles?: Partial<Record<SectionKey, string>>;
  /** Optional footer line; off unless the user turns it on. */
  watermark?: { enabled: boolean; text: string };
  /** Typography, palette and order for the .docx. */
  design?: ExportDesign;
}

export interface ExportResult {
  format: ExportFormat;
  ok: boolean;
  message: string;
}

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
          await this.exportDocx(
            opts.data,
            opts.colors,
            name,
            opts.watermark,
            opts.titles,
            opts.design,
          );
          return { format, ok: true, message: `Word descargado (${name}.docx).` };
        case 'pdf':
          await this.exportPdf(opts.paperEl ?? null, name);
          return { format, ok: true, message: `PDF descargado (${name}.pdf).` };
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
        if (period) out.push(`*${period}*`);
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

    if (cv.references.length) {
      out.push('', `## ${SECTION_TITLES.references}`);
      for (const r of cv.references) {
        const meta = [r.email, r.phone].filter(Boolean).join(' · ');
        const line = [r.name, r.title].filter(Boolean).join(' — ');
        out.push(`- **${line}**${meta ? ` — ${meta}` : ''}`);
        if (r.email) out.push(`  ${r.email}`);
        if (r.phone) out.push(`  ${r.phone}`);
      }
    }

    if (cv.customSections.length) {
      out.push('', `## ${SECTION_TITLES.customSection}`);
      for (const c of cv.customSections) {
        const period = [c.startDate, c.endDate].filter(Boolean).join(' – ');
        out.push('', `### ${c.title}`);
        if (period) out.push(`*${period}*`);
        if (c.link) out.push('', `Enlace: ${toHref(c.link)}`);
        if (c.description) out.push('', c.description);
        for (const item of c.items.filter(Boolean)) out.push(`- ${item}`);
      }
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

  /* ── Word (.docx) ────────────────────────────────────────────────────── */

  async exportDocx(
    cv: CVData,
    colors: PaletteColors,
    name: string,
    watermark?: { enabled: boolean; text: string },
    titles?: Partial<Record<SectionKey, string>>,
    design?: ExportDesign,
  ): Promise<void> {
    const blob = await this.buildDocx(cv, colors, watermark, titles, design);
    this.download(blob, `${name}.docx`);
  }

  /**
   * The Word file, as bytes. Separate from the download so a test can open the
   * generated package and check that the design actually made it in.
   */
  async buildDocx(
    cv: CVData,
    colors: PaletteColors,
    watermark?: { enabled: boolean; text: string },
    titles?: Partial<Record<SectionKey, string>>,
    design?: ExportDesign,
  ): Promise<Blob> {
    const look = docxLook(design?.templateId ?? DEFAULT_TEMPLATE_ID, colors);
    const order = documentOrder(
      design?.sectionOrder ?? DEFAULT_SECTION_ORDER,
      design?.layoutId ?? DEFAULT_LAYOUT_ID,
    );
    const children = this.docxChildren(cv, look, order, titles);
    if (watermark?.enabled && watermark.text.trim()) {
      children.push(
        new Paragraph({
          spacing: { before: 340 },
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: watermark.text.trim(),
              font: look.bodyFont,
              size: Math.round(look.bodySize * 0.8),
              color: '9CA3AF',
            }),
          ],
        }),
      );
    }
    const doc = new Document({
      creator: cv.personalInfo.name || 'CV',
      title: `CV — ${cv.personalInfo.name}`,
      description: 'Currículum generado con CV-Generador',
      styles: {
        default: {
          document: {
            run: { font: look.bodyFont, size: look.bodySize, color: look.ink },
            paragraph: { spacing: { line: look.line } },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: look.padY,
                right: look.padX,
                bottom: look.padY,
                left: look.padX,
              },
            },
          },
          children,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    return blob;
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

  /**
   * The Word body, following the design the user picked.
   *
   * A .docx has no CSS, so `look` carries the template's typography, colours
   * and rules as data. The layout stays linear on purpose: sections are written
   * in the order the document shows them (side column first when there is one),
   * so the file is the same CV the person edited, and no tables or text boxes
   * stand between an ATS parser and the text.
   */
  private docxChildren(
    cv: CVData,
    look: DocxLook,
    order: SectionKey[],
    titles?: Partial<Record<SectionKey, string>>,
  ): Paragraph[] {
    // Same shadow trick as the Markdown builder: profiles rename sections
    // without every line below having to change.
    const SECTION_TITLES = { ...BASE_SECTION_TITLES, ...(titles ?? {}) };
    const nodes: Paragraph[] = [];
    const p = cv.personalInfo;
    // Only the header follows the template's alignment. In the preview the
    // section titles are the other centred piece (`--cv-heading-align`), so the
    // body — summary, entries, bullets — stays left even in Académico and
    // Universidad: that is the "ordered" look, not a page of centred text.
    const headerAlign = look.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT;
    const body = look.bodySize;
    const meta = Math.round(body * 0.86); // dates, technologies, small print
    const entry = Math.round(body * 1.08); // job titles, degrees, project names
    const text = (value: string, size = body, color = look.ink, bold = false): TextRun =>
      new TextRun({ text: value, font: look.bodyFont, size, color, bold });

    const photo = p.photo ? this.photoRun(p.photo) : null;
    if (photo) {
      nodes.push(new Paragraph({ spacing: { after: 0 }, children: [photo] }));
    }

    if (p.name) {
      nodes.push(
        new Paragraph({
          alignment: headerAlign,
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: look.name.upper ? p.name.toUpperCase() : p.name,
              font: look.bodyFont,
              size: look.name.size,
              bold: look.name.bold,
              color: look.name.color,
              characterSpacing: look.name.tracking,
            }),
          ],
        }),
      );
    }

    if (p.title) {
      nodes.push(
        new Paragraph({
          alignment: headerAlign,
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: look.title.upper ? p.title.toUpperCase() : p.title,
              font: look.bodyFont,
              size: look.title.size,
              bold: look.title.bold,
              italics: look.title.italic,
              color: look.title.color,
              characterSpacing: look.title.tracking,
            }),
          ],
        }),
      );
    }

    // Contact line, joined with a middle dot. Email, phone and city stay as
    // plain text (that is what an ATS reads); the profile links carry their
    // name and stay clickable in Word.
    const contactRuns: (TextRun | ExternalHyperlink)[] = [];
    for (const c of this.contactsOf(p)) {
      if (contactRuns.length) contactRuns.push(text('  ·  ', meta, look.muted));
      contactRuns.push(
        c.href
          ? new ExternalHyperlink({
              link: toHref(c.href),
              children: [
                new TextRun({
                  text: c.text,
                  font: look.bodyFont,
                  size: meta,
                  color: look.accent,
                  underline: {},
                }),
              ],
            })
          : text(c.text, meta, look.muted),
      );
    }
    if (contactRuns.length) {
      nodes.push(
        new Paragraph({ alignment: headerAlign, spacing: { after: 60 }, children: contactRuns }),
      );
    }

    /**
     * A row with the entry on the left and its dates flush right, exactly like
     * the preview. Left aligned on purpose: the preview lays this row out with
     * flexbox, so the centred templates do not centre it either.
     */
    const head = (left: TextRun[], right?: string): Paragraph =>
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 120, after: 0 },
        tabStops: [{ type: TabStopType.RIGHT, position: look.textWidth }],
        children: right
          ? [
              ...left,
              new TextRun({
                text: `\t${right}`,
                font: look.accentFont,
                size: meta,
                color: look.muted,
              }),
            ]
          : left,
      });

    // Sections in the order the document shows them. The counter only feeds the
    // numbered template (Tesis).
    let number = 0;
    for (const key of order) {
      switch (key) {
        case 'summary': {
          if (!cv.summary) break;
          nodes.push(this.sectionHeading(SECTION_TITLES.summary, look, ++number));
          nodes.push(new Paragraph({ children: [text(cv.summary)] }));
          break;
        }

        case 'experience': {
          if (!cv.experience.length) break;
          nodes.push(this.sectionHeading(SECTION_TITLES.experience, look, ++number));
          for (const e of cv.experience) {
            nodes.push(
              head(
                [
                  text(e.position || '', entry, look.ink, true),
                  ...(e.company ? [text(`  ·  ${e.company}`, entry, look.secondary)] : []),
                ],
                [e.startDate, e.endDate].filter(Boolean).join(' – '),
              ),
            );
            if (e.description) {
              nodes.push(
                new Paragraph({
                  spacing: { after: 40 },
                  children: [text(e.description)],
                }),
              );
            }
            for (const a of e.achievements.filter(Boolean)) {
              nodes.push(
                new Paragraph({
                  bullet: { level: 0 },
                  spacing: { after: 20 },
                  children: [text(a)],
                }),
              );
            }
          }
          break;
        }

        case 'education': {
          if (!cv.education.length) break;
          nodes.push(this.sectionHeading(SECTION_TITLES.education, look, ++number));
          for (const ed of cv.education) {
            const degree = [ed.degree, ed.field].filter(Boolean).join(', ');
            const right = [ed.startDate, ed.endDate]
              .filter(Boolean)
              .join(' – ');
            nodes.push(
              head(
                [
                  text(degree, entry, look.ink, true),
                  ...(ed.institution
                    ? [text(`  ·  ${ed.institution}`, entry, look.secondary)]
                    : []),
                ],
                right || undefined,
              ),
            );
          }
          break;
        }

        case 'skills': {
          if (!cv.skills.length) break;
          nodes.push(this.sectionHeading(SECTION_TITLES.skills, look, ++number));
          for (const s of cv.skills) {
            const items = s.items.filter(Boolean).join(', ');
            if (!items) continue;
            nodes.push(
              new Paragraph({
                spacing: { after: 40 },
                children: [text(`${s.category}: `, body, look.ink, true), text(items)],
              }),
            );
          }
          break;
        }

        case 'languages': {
          if (!cv.languages.length) break;
          nodes.push(this.sectionHeading(SECTION_TITLES.languages, look, ++number));
          for (const l of cv.languages) {
            nodes.push(
              new Paragraph({
                bullet: { level: 0 },
                spacing: { after: 20 },
                children: [
                  text(`${l.language} — ${PROFICIENCY_LABELS[l.proficiency] ?? l.proficiency}`),
                ],
              }),
            );
          }
          break;
        }

        case 'projects': {
          if (!cv.projects.length) break;
          nodes.push(this.sectionHeading(SECTION_TITLES.projects, look, ++number));
          for (const pr of cv.projects) {
            nodes.push(
              new Paragraph({
                spacing: { before: 120, after: 0 },
                children: [text(pr.name || '', entry, look.ink, true)],
              }),
            );
            if (pr.description) {
              nodes.push(
                new Paragraph({
                  spacing: { after: 40 },
                  children: [text(pr.description)],
                }),
              );
            }
            const tech = pr.technologies.filter(Boolean).join(', ');
            if (tech) {
              nodes.push(
                new Paragraph({
                  spacing: { after: 40 },
                  children: [
                    text('Tecnologías: ', meta, look.ink, true),
                    text(tech, meta, look.muted),
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
                if (runs.length) runs.push(text('  ·  ', meta, look.muted));
                runs.push(
                  new ExternalHyperlink({
                    link: toHref(link.url),
                    children: [
                      new TextRun({
                        text: link.label,
                        font: look.bodyFont,
                        size: meta,
                        color: look.accent,
                        underline: {},
                      }),
                    ],
                  }),
                );
              }
              nodes.push(new Paragraph({ spacing: { after: 40 }, children: runs }));
            }
          }
          break;
        }

        case 'certifications': {
          if (!cv.certifications.length) break;
          nodes.push(this.sectionHeading(SECTION_TITLES.certifications, look, ++number));
          for (const c of cv.certifications) {
            const metaLine = [c.issuer, c.date].filter(Boolean).join(', ');
            nodes.push(
              new Paragraph({
                spacing: { after: 20 },
                children: [
                  text(c.name, body, look.ink, true),
                  ...(metaLine ? [text(` — ${metaLine}`, body, look.muted)] : []),
                ],
              }),
            );
          }
          break;
        }

        case 'publications': {
          if (!cv.publications.length) break;
          nodes.push(this.sectionHeading(SECTION_TITLES.publications, look, ++number));
          for (const pub of cv.publications) {
            const metaLine = [pub.publisher, pub.date].filter(Boolean).join(', ');
            nodes.push(
              new Paragraph({
                spacing: { after: 20 },
                children: [
                  text(pub.title, body, look.ink, true),
                  ...(metaLine ? [text(` — ${metaLine}`, body, look.muted)] : []),
                ],
              }),
            );
            if (pub.description) {
              nodes.push(
                new Paragraph({
                  spacing: { after: 40 },
                  children: [text(pub.description, meta, look.muted)],
                }),
              );
            }
          }
          break;
        }

        case 'volunteerWork': {
          if (!cv.volunteerWork.length) break;
          nodes.push(this.sectionHeading(SECTION_TITLES.volunteerWork, look, ++number));
          for (const v of cv.volunteerWork) {
            nodes.push(
              head(
                [
                  text(v.role || '', entry, look.ink, true),
                  ...(v.organization
                    ? [text(`  ·  ${v.organization}`, entry, look.secondary)]
                    : []),
                ],
                [v.startDate, v.endDate].filter(Boolean).join(' – '),
              ),
            );
            if (v.description) {
              nodes.push(
                new Paragraph({
                  spacing: { after: 40 },
                  children: [text(v.description)],
                }),
              );
            }
          }
          break;
        }

        case 'awards': {
          if (!cv.awards.length) break;
          nodes.push(this.sectionHeading(SECTION_TITLES.awards, look, ++number));
          for (const a of cv.awards) {
            const metaLine = [a.issuer, a.date].filter(Boolean).join(', ');
            nodes.push(
              new Paragraph({
                spacing: { after: 20 },
                children: [
                  text(a.title, body, look.ink, true),
                  ...(metaLine ? [text(` — ${metaLine}`, body, look.muted)] : []),
                ],
              }),
            );
          }
          break;
        }

        case 'interests': {
          if (!cv.interests.length) break;
          nodes.push(this.sectionHeading(SECTION_TITLES.interests, look, ++number));
          nodes.push(
            new Paragraph({ children: [text(cv.interests.join('  ·  '))] }),
          );
          break;
        }

        case 'references': {
          if (!cv.references.length) break;
          nodes.push(this.sectionHeading(SECTION_TITLES.references, look, ++number));
          for (const r of cv.references) {
            const line = [r.name, r.title].filter(Boolean).join(' — ');
            const meta = [r.email, r.phone].filter(Boolean).join(' · ');
            nodes.push(
              new Paragraph({
                spacing: { after: 20 },
                children: [
                  text(line, body, look.ink, true),
                  ...(meta ? [text(` — ${meta}`, body, look.muted)] : []),
                ],
              }),
            );
          }
          break;
        }

        case 'customSection': {
          if (!cv.customSections.length) break;
          nodes.push(this.sectionHeading(SECTION_TITLES.customSection, look, ++number));
          for (const c of cv.customSections) {
            const period = [c.startDate, c.endDate].filter(Boolean).join(' – ');
            nodes.push(
              new Paragraph({
                spacing: { before: 120, after: 0 },
                children: [text(c.title || '', entry, look.ink, true)],
              }),
            );
            if (period) {
              nodes.push(
                new Paragraph({
                  spacing: { after: 40 },
                  children: [
                    new TextRun({
                      text: period,
                      font: look.accentFont,
                      size: meta,
                      color: look.muted,
                      italics: true,
                    }),
                  ],
                }),
              );
            }
            if (c.link) {
              nodes.push(
                new Paragraph({
                  spacing: { after: 40 },
                  children: [
                    text('Enlace: ', meta, look.ink, true),
                    new ExternalHyperlink({
                      link: toHref(c.link),
                      children: [new TextRun({ text: c.link, font: look.bodyFont, size: meta, color: look.accent, underline: {} })],
                    }),
                  ],
                }),
              );
            }
            if (c.description) {
              nodes.push(
                new Paragraph({
                  spacing: { after: 40 },
                  children: [text(c.description)],
                }),
              );
            }
            for (const item of c.items.filter(Boolean)) {
              nodes.push(
                new Paragraph({
                  bullet: { level: 0 },
                  spacing: { after: 20 },
                  children: [text(item)],
                }),
              );
            }
          }
          break;
        }
      }
    }

    if (!nodes.length) {
      nodes.push(new Paragraph({ children: [text('CV vacío')] }));
    }

    return nodes;
  }

  /**
   * Section title with the template's casing, colour, tracking and rule. The
   * `heading` style keeps the document outline (and therefore the navigation
   * pane and every ATS that reads Word styles) working; the font, size and
   * colour are stated per run so the palette wins over Word's blue default.
   */
  private sectionHeading(text: string, look: DocxLook, index: number): Paragraph {
    const h = look.heading;
    const bottom =
      h.rule === 'none'
        ? null
        : {
            style: h.rule === 'dashed' ? BorderStyle.DASHED : BorderStyle.SINGLE,
            size: h.rule === 'thick' ? 12 : 6,
            color: h.rule === 'thick' ? look.primary : look.rule,
            space: 4,
          };
    const border = {
      ...(bottom ? { bottom } : {}),
      ...(h.edge
        ? { left: { style: BorderStyle.SINGLE, size: 18, color: look.accent, space: 6 } }
        : {}),
    };
    const label = `${h.numbered ? `${index}. ` : ''}${h.upper ? text.toUpperCase() : text}`;

    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      alignment: look.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { before: look.sectionGap, after: 110 },
      ...(Object.keys(border).length ? { border } : {}),
      children: [
        new TextRun({
          text: label,
          font: look.accentFont,
          size: h.size,
          bold: h.bold,
          color: h.color,
          characterSpacing: h.tracking,
        }),
      ],
    });
  }
  /* ── PDF ─────────────────────────────────────────────────────────────── */

  /**
   * Builds the PDF in the browser and downloads it, no print dialog in the way.
   *
   * The sheet is rasterised with `html2canvas` and sliced into A4 pages, so the
   * file carries the design exactly as the preview shows it: template, palette,
   * rules, photo and all. A JPEG cannot hold links, so each one comes back as an
   * invisible annotation over its own text: that is what makes the header and the
   * project links clickable in the PDF.
   *
   * The trade-off is the text itself: being an image, a portal that extracts the
   * text (most ATS) reads nothing, so the Word file is the one to send there.
   */
  async exportPdf(paperEl: HTMLElement | null, name: string): Promise<void> {
    if (!paperEl) throw new Error('El lienzo del CV todavía no está listo.');

    // Loaded on demand: the pair is a few hundred kB and most people export
    // Word, so the first paint should not pay for a PDF engine.
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    const raster = await this.rasterize(paperEl, html2canvas);
    const { canvas } = raster;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    // How many canvas pixels fit on one page, when the width fills the paper.
    const pagePixels = (canvas.width * pageHeight) / pageWidth;
    // The sheet's own padding becomes the top margin of the continuation pages,
    // so a page that starts at a section heading does not start flush against
    // the paper edge.
    const inset = raster.padTop;
    const insetMm = (inset * pageWidth) / canvas.width;
    // Canvas pixels → millimetres, shared by the bands and the links.
    const mm = pageWidth / canvas.width;

    let offset = 0;
    let page = 0;
    while (offset < canvas.height) {
      const limit = page === 0 ? pagePixels : pagePixels - inset;
      const end = this.endOfPage(raster, offset, offset + limit, canvas.height);
      const height = Math.max(1, Math.round(end - offset));
      const top = page > 0 ? insetMm : 0;
      if (page > 0) pdf.addPage();
      pdf.addImage(this.slice(canvas, offset, height), 'JPEG', 0, top, pageWidth, height * mm);
      for (const link of raster.links) this.addLink(pdf, link, offset, end, top, mm);
      offset += height;
      page += 1;
    }

    pdf.setProperties({ title: `CV — ${name}`, creator: 'CV-Generador' });
    pdf.save(`${name}.pdf`);
  }

  /**
   * Puts one clickable link back where the raster shows it.
   *
   * `bandTop`/`bandBottom` are the pixels of the page being built and `pageTop`
   * is where that band landed on the paper, so a link that the page break cuts in
   * two only becomes an annotation on the page that shows most of it.
   */
  private addLink(
    pdf: import('jspdf').jsPDF,
    link: RasterLink,
    bandTop: number,
    bandBottom: number,
    pageTop: number,
    mm: number,
  ): void {
    const top = Math.max(link.top, bandTop);
    const bottom = Math.min(link.top + link.height, bandBottom);
    if (bottom - top < link.height * 0.4) return;
    pdf.link(link.left * mm, pageTop + (top - bandTop) * mm, link.width * mm, (bottom - top) * mm, {
      url: link.url,
    });
  }

  /**
   * Where the page should end.
   *
   * Slicing at a fixed height cuts headings and entries in half; the raster
   * carries the offsets where a section (preferred) or an item starts, so the
   * page ends at the closest one above the limit — but never so early that the
   * page comes out half empty (unless the document really ends there).
   */
  private endOfPage(
    raster: { sections: number[]; items: number[] },
    offset: number,
    ideal: number,
    total: number,
  ): number {
    if (ideal >= total) return total;
    const floor = offset + (ideal - offset) * 0.65;
    return (
      this.lastCut(raster.sections, floor, ideal) ||
      this.lastCut(raster.items, floor, ideal) ||
      ideal
    );
  }

  /** The furthest cut that still fits, or 0 when none does. */
  private lastCut(cuts: number[], floor: number, ideal: number): number {
    let best = 0;
    for (const cut of cuts) {
      if (cut >= floor && cut <= ideal && cut > best) best = cut;
    }
    return best;
  }

  /**
   * Rasterises the sheet at 100 % zoom, off screen.
   *
   * The preview is displayed with a CSS `zoom` (the 80 % default), and a zoomed
   * element would come out blurry, so the sheet is cloned into a hidden host at
   * its natural size first. The clone keeps the palette (inline custom
   * properties), the template class and the photo, because it stays in the same
   * document with the same stylesheets.
   */
  private async rasterize(
    paperEl: HTMLElement,
    html2canvas: typeof import('html2canvas')['default'],
  ): Promise<{
    canvas: HTMLCanvasElement;
    sections: number[];
    items: number[];
    padTop: number;
    links: RasterLink[];
  }> {
    const host = document.createElement('div');
    host.setAttribute(
      'style',
      'position:fixed;left:-10000px;top:0;background:#ffffff;width:210mm;',
    );
    const clone = paperEl.cloneNode(true) as HTMLElement;
    clone.style.boxShadow = 'none';
    clone.style.margin = '0';
    host.appendChild(clone);
    document.body.appendChild(host);
    try {
      const canvas = await html2canvas(clone, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });
      const offsets = this.blockOffsets(clone, canvas);
      return { canvas, ...offsets, links: this.linkRects(clone, canvas) };
    } finally {
      host.remove();
    }
  }

  /** Every outgoing link of the sheet, in canvas pixels. */
  private linkRects(clone: HTMLElement, canvas: HTMLCanvasElement): RasterLink[] {
    const rect = clone.getBoundingClientRect();
    const height = clone.offsetHeight || rect.height;
    if (!height) return [];
    const factor = canvas.height / height;
    const out: RasterLink[] = [];
    clone.querySelectorAll('a[href]').forEach((node) => {
      const anchor = node as HTMLAnchorElement;
      const box = anchor.getBoundingClientRect();
      // `href` is already absolute; an in-page anchor would be a dead annotation.
      if (!box.width || !box.height || !anchor.href.startsWith('http')) return;
      out.push({
        url: anchor.href,
        left: (box.left - rect.left) * factor,
        top: (box.top - rect.top) * factor,
        width: box.width * factor,
        height: box.height * factor,
      });
    });
    return out;
  }

  /** Canvas-pixel heights at which a section or an item begins, and the sheet's
   * own top padding (the natural margin of a continuation page). */
  private blockOffsets(
    clone: HTMLElement,
    canvas: HTMLCanvasElement,
  ): { sections: number[]; items: number[]; padTop: number } {
    const rect = clone.getBoundingClientRect();
    const height = clone.offsetHeight || rect.height;
    if (!height) return { sections: [], items: [], padTop: 0 };
    // The clone is at 100 %; the canvas may have been rounded, so scale by the
    // ratio between the two instead of assuming the requested one.
    const factor = canvas.height / height;
    const offsetsIn = (selector: string): number[] =>
      Array.from(clone.querySelectorAll(selector))
        .map((node) => (node.getBoundingClientRect().top - rect.top) * factor)
        .filter((top) => top > 24)
        .sort((a, b) => a - b);
    const padTop = (Number.parseFloat(getComputedStyle(clone).paddingTop) || 0) * factor;
    return { sections: offsetsIn('.cv-section'), items: offsetsIn('.cv-item'), padTop };
  }

  /** One A4-sized band of the raster, as a JPEG data URL. */
  private slice(canvas: HTMLCanvasElement, offset: number, height: number): string {
    const band = document.createElement('canvas');
    band.width = canvas.width;
    band.height = height;
    const ctx = band.getContext('2d');
    if (!ctx) throw new Error('El navegador no permitió preparar el PDF.');
    // White first: JPEG has no alpha channel and the gaps would turn black.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, band.width, band.height);
    ctx.drawImage(canvas, 0, offset, canvas.width, height, 0, 0, canvas.width, height);
    return band.toDataURL('image/jpeg', 0.92);
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
