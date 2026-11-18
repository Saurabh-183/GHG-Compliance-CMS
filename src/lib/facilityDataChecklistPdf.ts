import PDFDocument from 'pdfkit';
import type { IFacilityDataChecklist } from '@/types';
import { checklistSummary } from '@/lib/facilityDataChecklistStore';

const STATUS_LABEL: Record<string, string> = {
  DUE: 'Due',
  RECEIVED: 'Received',
  NOT_APPLICABLE: 'Not Applicable',
  NOT_REQUIRED: 'Not Required',
};

export function buildFacilityChecklistPdfBuffer(checklist: IFacilityDataChecklist): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const summary = checklistSummary(checklist.items);
    const title = checklist.facilityName || checklist.facilityId;

    doc.fontSize(16).font('Helvetica-Bold').text('Facility Data Collection Checklist', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(`Company / Facility: ${title}`, { align: 'center' });
    doc.text(`Facility ID: ${checklist.facilityId} · Period: ${checklist.period}`, { align: 'center' });
    doc.moveDown(0.75);
    doc
      .fontSize(10)
      .text(
        `Summary — Received: ${summary.received} · Due: ${summary.due} · Not applicable: ${summary.notApplicable} · Applicable items: ${summary.applicable}`,
        { align: 'left' }
      );

    if (checklist.consultantNotes?.trim()) {
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Consultant notes:');
      doc.font('Helvetica').text(checklist.consultantNotes.trim(), { width: 500 });
    }

    doc.moveDown(1);
    const colX = [48, 58, 400];
    const rowHeight = 22;
    let y = doc.y;

    const drawHeader = () => {
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text('#', colX[0], y, { width: 30 });
      doc.text('Report / Data Item', colX[1], y, { width: 330 });
      doc.text('Status', colX[2], y, { width: 100 });
      y += rowHeight;
      doc.moveTo(48, y).lineTo(547, y).strokeColor('#cccccc').stroke();
      y += 6;
    };

    drawHeader();
    doc.font('Helvetica').fontSize(8);

    checklist.items
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((item, index) => {
        if (y > 740) {
          doc.addPage();
          y = 48;
          drawHeader();
          doc.font('Helvetica').fontSize(8);
        }
        doc.text(String(index + 1), colX[0], y, { width: 30 });
        doc.text(item.label, colX[1], y, { width: 330 });
        doc.text(STATUS_LABEL[item.status] || item.status, colX[2], y, { width: 100 });
        if (item.notes?.trim()) {
          y += 12;
          doc.fillColor('#555555').text(`Note: ${item.notes.trim()}`, colX[1], y, { width: 330 });
          doc.fillColor('#000000');
        }
        y += rowHeight;
      });

    doc.moveDown(2);
    doc.fontSize(8).fillColor('#666666').text(
      `Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · Carbon Crunch Compliance CMS`,
      { align: 'center' }
    );

    doc.end();
  });
}