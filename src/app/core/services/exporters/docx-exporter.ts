import { Injectable, inject } from '@angular/core';
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
import { DEFAULT_LAYOUT_ID, DEFAULT_TEMPLATE_ID } from '../../models/catalog';
import type { CVData, PaletteColors } from '../../models/cv-data';
import {
  CONTACT_LABELS,
  LINK_LABEL,
  PROJECT_LABELS,
  SECTION_TITLES as BASE_SECTION_TITLES,
  toHref,
} from '../../models/labels';
import { documentOrder, type SectionKey } from '../../models/sections';
import { docxLook, type DocxLook } from '../docx-look';
import type { ExportDesign } from '../exporter.service';

/** Exporta el CV como documento Word (.docx) con diseño, paleta y colores. */
@Injectable({ providedIn: 'root' })
export class DocxExporter {
  /** Construye el archivo Word como un Blob (separado de la descarga para tests). */
  async buildDocx(
    cv: CVData,
    colors: PaletteColors,
    watermark?: { enabled: boolean; text: string },
    titles?: Partial<Record<SectionKey, string>>,
    design?: ExportDesign,
  ): Promise<Blob> {
    const look = docxLook(design?.templateId ?? DEFAULT_TEMPLATE_ID, colors);
    const order = documentOrder(
      (design?.sectionOrder ?? []) as SectionKey[],
      design?.layoutId ?? 'single',
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

    return Packer.toBlob(doc);
  }

  /** Descarga el archivo Word como .docx. */
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

  /* ── Cuerpo del documento Word ───────────────────────────────────────── */

  private docxChildren(
    cv: CVData,
    look: DocxLook,
    order: SectionKey[],
    titles?: Partial<Record<SectionKey, string>>,
  ): Paragraph[] {
    const SECTION_TITLES = { ...BASE_SECTION_TITLES, ...(titles ?? {}) };
    const nodes: Paragraph[] = [];
    const p = cv.personalInfo;
    const headerAlign = look.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT;
    const body = look.bodySize;
    const meta = Math.round(body * 0.86);
    const entry = Math.round(body * 1.08);
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
                  text(`${l.language} — ${l.proficiency}`),
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
            const linkRun = c.url
              ? new ExternalHyperlink({
                  link: toHref(c.url),
                  children: [
                    new TextRun({
                      text: ` ${LINK_LABEL}`,
                      font: look.accentFont,
                      size: meta,
                      color: look.accent,
                      underline: {},
                    }),
                  ],
                })
              : null;
            nodes.push(
              new Paragraph({
                spacing: { after: 20 },
                children: [
                  text(c.name, body, look.ink, true),
                  ...(metaLine ? [text(` — ${metaLine}`, body, look.muted)] : []),
                  ...(linkRun ? [linkRun] : []),
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
            const linkRun = pub.url
              ? new ExternalHyperlink({
                  link: toHref(pub.url),
                  children: [
                    new TextRun({
                      text: ` ${LINK_LABEL}`,
                      font: look.accentFont,
                      size: meta,
                      color: look.accent,
                      underline: {},
                    }),
                  ],
                })
              : null;
            nodes.push(
              new Paragraph({
                spacing: { after: 20 },
                children: [
                  text(pub.title, body, look.ink, true),
                  ...(metaLine ? [text(` — ${metaLine}`, body, look.muted)] : []),
                  ...(linkRun ? [linkRun] : []),
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
                      children: [
                        new TextRun({
                          text: c.link,
                          font: look.bodyFont,
                          size: meta,
                          color: look.accent,
                          underline: {},
                        }),
                      ],
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

  /* ── Foto y contactos ────────────────────────────────────────────────── */

  private decodeBase64(payload: string): Uint8Array {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

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
