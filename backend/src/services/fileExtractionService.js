import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';

const MIN_TEXT_LENGTH = 25;

function readFileBuffer(filePath) {
  return fs.readFileSync(filePath);
}

async function extractPdfText(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text?.replace(/\s+/g, ' ').trim() || '';
  } finally {
    await parser.destroy();
  }
}

async function pdfFirstPageToBase64(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getScreenshot({
      partial: [1],
      scale: 2,
      imageBuffer: true,
      imageDataUrl: false,
    });

    const pageData = result.pages?.[0]?.data;
    if (!pageData) {
      throw new Error('Could not render PDF page for OCR');
    }

    const pngBuffer = Buffer.isBuffer(pageData) ? pageData : Buffer.from(pageData);
    return pngBuffer.toString('base64');
  } finally {
    await parser.destroy();
  }
}

export async function extractContentFromUploadedFile(file) {
  if (!file?.path) {
    return { text: null, imageBase64: null, mimeType: null };
  }

  const buffer = readFileBuffer(file.path);
  const mimeType = file.mimetype || '';
  const ext = path.extname(file.originalname || file.filename || '').toLowerCase();
  const isPdf = mimeType === 'application/pdf' || ext === '.pdf';
  const isImage = mimeType.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);

  if (isPdf) {
    let text = '';
    try {
      text = await extractPdfText(buffer);
    } catch {
      text = '';
    }

    if (text.length >= MIN_TEXT_LENGTH) {
      return { text, imageBase64: null, mimeType: 'application/pdf', source: 'pdf-text' };
    }

    const imageBase64 = await pdfFirstPageToBase64(buffer);
    return {
      text: text || null,
      imageBase64,
      mimeType: 'image/png',
      source: 'pdf-vision',
    };
  }

  if (isImage) {
    const resolvedMime = mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
    return {
      text: null,
      imageBase64: buffer.toString('base64'),
      mimeType: resolvedMime,
      source: 'image-vision',
    };
  }

  throw new Error('Unsupported file type. Please upload a PDF or image (JPG, PNG, WEBP).');
}

export async function resolveUploadInput({ rawText, manualEntry, file }) {
  const typedText = (rawText || manualEntry || '').trim();

  if (file) {
    const extracted = await extractContentFromUploadedFile(file);
    return {
      text: typedText || extracted.text,
      imageBase64: extracted.imageBase64,
      mimeType: extracted.mimeType,
      source: extracted.source,
    };
  }

  if (typedText) {
    return { text: typedText, imageBase64: null, mimeType: null, source: 'text' };
  }

  throw new Error('Enter text or upload a PDF/image file');
}
