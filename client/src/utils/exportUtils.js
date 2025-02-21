import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { marked } from 'marked';

const parseMarkdown = (content) => {
  // Convert markdown to HTML
  const html = marked(content);
  // Remove HTML tags but preserve line breaks and lists
  return html
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '\n\n')
    .replace(/<li>/g, '• ')
    .replace(/<\/li>/g, '\n')
    .replace(/<blockquote>/g, '> ')
    .replace(/<\/blockquote>/g, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\n\n+/g, '\n\n')
    .trim();
};

export const exportToPDF = (content) => {
  const doc = new jsPDF();
  const parsedContent = parseMarkdown(content);
  const fontSize = 12;
  const lineHeight = 1.15;
  const margin = 15;
  const pageWidth = doc.internal.pageSize.width - 2 * margin;
  
  // Split text into lines with proper width calculation
  const lines = doc.setFontSize(fontSize).splitTextToSize(parsedContent, pageWidth);
  
  let cursorY = margin;
  const pageHeight = doc.internal.pageSize.height;
  
  lines.forEach(line => {
    if (cursorY > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    }
    doc.text(line, margin, cursorY);
    cursorY += fontSize * lineHeight;
  });

  doc.save('summary_export.pdf');
};

export const exportToDocx = async (content) => {
  const parsedContent = parseMarkdown(content);
  const paragraphs = parsedContent.split('\n\n').map(text => {
    if (text.startsWith('• ')) {
      // Handle bullet points
      return new Paragraph({
        children: [new TextRun({ text: text.trim() })],
        bullet: { level: 0 }
      });
    } else if (text.startsWith('> ')) {
      // Handle blockquotes
      return new Paragraph({
        children: [new TextRun({ text: text.substring(2).trim(), italics: true })],
        indent: { left: 720 }, // 0.5 inch indent
        spacing: { before: 240, after: 240 } // Add some spacing
      });
    } else {
      // Regular paragraphs
      return new Paragraph({
        children: [new TextRun({ text: text.trim() })],
        spacing: { after: 240 }
      });
    }
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: paragraphs
    }]
  });

  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'summary_export.docx';
  a.click();
  window.URL.revokeObjectURL(url);
};

export const exportToTXT = (content) => {
  const parsedContent = parseMarkdown(content);
  const blob = new Blob([parsedContent], { type: 'text/plain;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'summary_export.txt';
  a.click();
  window.URL.revokeObjectURL(url);
};
