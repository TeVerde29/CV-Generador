import { Injectable } from '@angular/core';
import {
  CONTACT_LABELS,
  LINK_LABEL,
  PROJECT_LABELS,
  SECTION_TITLES as BASE_SECTION_TITLES,
  toHref,
} from '../../models/labels';
import type { CVData } from '../../models/cv-data';
import type { SectionKey } from '../../models/sections';

/** Exporta el CV como texto Markdown estructurado. */
@Injectable({ providedIn: 'root' })
export class MarkdownExporter {
  /**
   * Construye el contenido Markdown. El correo, el teléfono y la ciudad van
   * como texto plano; los enlaces del perfil van con su nombre mostrado.
   */
  buildMarkdown(
    cv: CVData,
    watermark?: { enabled: boolean; text: string },
    titles?: Partial<Record<SectionKey, string>>,
  ): string {
    const SECTION_TITLES = { ...BASE_SECTION_TITLES, ...(titles ?? {}) };
    const out: string[] = [];
    const p = cv.personalInfo;

    if (p.name) out.push(`# ${p.name}`);
    if (p.title) out.push(`**${p.title}**`);

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
        out.push(`- ${l.language} — ${l.proficiency}`);
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
        const link = c.url ? ` ([${LINK_LABEL}](${toHref(c.url)}))` : '';
        out.push(`- **${c.name}**${meta ? ` — ${meta}` : ''}${link}`);
      }
    }

    if (cv.publications.length) {
      out.push('', `## ${SECTION_TITLES.publications}`);
      for (const pub of cv.publications) {
        const meta = [pub.publisher, pub.date].filter(Boolean).join(', ');
        const link = pub.url ? ` ([${LINK_LABEL}](${toHref(pub.url)}))` : '';
        out.push(`- **${pub.title}**${meta ? ` — ${meta}` : ''}${link}`);
        if (pub.description) out.push(`  ${pub.description}`);
      }
    }

    if (cv.volunteerWork.length) {
      out.push('', `## ${SECTION_TITLES.volunteerWork}`);
      for (const v of cv.volunteerWork) {
        const period = [v.startDate, v.endDate].filter(Boolean).join(' – ');
        out.push('', `### ${[v.role, v.organization].filter(Boolean).join(' — ')}`);
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

  /** Descarga el Markdown como archivo .md. */
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
