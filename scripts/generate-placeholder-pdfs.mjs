// Generates minimal, valid single-page placeholder PDFs for the Transparency
// and Evidence pages' "downloadable reports" sections. Replace the files in
// public/reports/ with the real audited documents before launch — see README.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, 'public/reports');
mkdirSync(outDir, { recursive: true });

function escapePdfText(text) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildPdf(lines) {
  const contentLines = lines
    .map((line, i) => {
      const [text, size = 12, y] = Array.isArray(line) ? line : [line, 12, 700 - i * 24];
      return `BT /F1 ${size} Tf 72 ${y} Td (${escapePdfText(text)}) Tj ET`;
    })
    .join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${contentLines.length} >>\nstream\n${contentLines}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return pdf;
}

const docs = [
  {
    file: 'annual-report-2025.pdf',
    lines: [
      ['Samma farger — Annual Report 2025 (placeholder)', 18, 700],
      ['This is a placeholder document generated for site scaffolding.', 12, 664],
      ['Replace with the real audited annual report before launch.', 12, 646],
      ['See README.md: "Updating financial figures and reports".', 12, 628],
    ],
  },
  {
    file: 'audit-statement-2025.pdf',
    lines: [
      ['Samma farger — Independent Audit Statement 2025 (placeholder)', 16, 700],
      ['This is a placeholder document generated for site scaffolding.', 12, 664],
      ['Replace with the real signed audit statement before launch.', 12, 646],
    ],
  },
  {
    file: 'annual-report-2024.pdf',
    lines: [
      ['Samma farger — Annual Report 2024 (placeholder)', 18, 700],
      ['This is a placeholder document generated for site scaffolding.', 12, 664],
      ['Replace with the real audited annual report before launch.', 12, 646],
    ],
  },
];

for (const doc of docs) {
  writeFileSync(path.join(outDir, doc.file), buildPdf(doc.lines), 'latin1');
}

console.log('Generated placeholder PDFs in public/reports/');
