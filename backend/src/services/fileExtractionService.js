import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';

function readFileBuffer(filePath) {
  return fs.readFileSync(filePath);
}

async function withPdfParser(buffer, fn) {
  const parser = new PDFParse({ data: buffer });
  try {
    return await fn(parser);
  } finally {
    await parser.destroy();
  }
}

async function extractPdfText(buffer) {
  return withPdfParser(buffer, async (parser) => {
    const result = await parser.getText();
    return result.text?.replace(/\s+/g, ' ').trim() || '';
  });
}

async function pdfPagesToImages(buffer, maxPages = 3) {
  return withPdfParser(buffer, async (parser) => {
    let totalPages = 1;
    try {
      const info = await parser.getInfo({ parsePageInfo: true });
      totalPages = info?.total || info?.pages?.length || 1;
    } catch {
      totalPages = 1;
    }

    const pageCount = Math.min(Math.max(totalPages, 1), maxPages);
    const partial = Array.from({ length: pageCount }, (_, i) => i + 1);

    const result = await parser.getScreenshot({
      partial,
      scale: 2.5,
      imageBuffer: true,
      imageDataUrl: false,
    });

    const images = (result.pages || [])
      .map((page) => {
        const data = page?.data;
        if (!data) return null;
        const pngBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
        return { base64: pngBuffer.toString('base64'), mimeType: 'image/png' };
      })
      .filter(Boolean);

    if (!images.length) {
      throw new Error('Could not render PDF pages for OCR');
    }

    return images;
  });
}

export async function extractContentFromUploadedFile(file) {
  if (!file?.path) {
    return { text: null, images: [], mimeType: null };
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

    const images = await pdfPagesToImages(buffer, 3);

    return {
      text: text || null,
      images,
      imageBase64: images[0]?.base64 || null,
      mimeType: 'image/png',
      source: 'pdf-vision',
    };
  }

  if (isImage) {
    const resolvedMime = mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
    const base64 = buffer.toString('base64');
    return {
      text: null,
      images: [{ base64, mimeType: resolvedMime }],
      imageBase64: base64,
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
      images: extracted.images,
      imageBase64: extracted.imageBase64,
      mimeType: extracted.mimeType,
      source: extracted.source,
    };
  }

  if (typedText) {
    return { text: typedText, images: [], imageBase64: null, mimeType: null, source: 'text' };
  }

  throw new Error('Enter text or upload a PDF/image file');
}
