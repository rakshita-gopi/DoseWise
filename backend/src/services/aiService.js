import { callOpenRouter, callOpenRouterVision, parseJsonFromAI } from './openrouter.js';

const PRESCRIPTION_PROMPT = `You are a medical prescription parser for DoseWise healthcare app.
Extract structured medicine data from the prescription text or description provided.
Return ONLY valid JSON in this exact format:
{
  "doctorName": "string or null",
  "hospital": "string or null",
  "prescribedDate": "YYYY-MM-DD or null",
  "nextReviewDate": "YYYY-MM-DD or null",
  "medicines": [
    {
      "medicineName": "string",
      "strength": "string e.g. 500mg",
      "morning": 0,
      "afternoon": 0,
      "night": 0,
      "foodType": "before_food|after_food|with_food|any",
      "duration": "string e.g. 30 days",
      "instructions": "string or null"
    }
  ]
}
Parse dosage like "1 Morning + 1 Night" as morning:1, afternoon:0, night:1.
If information is missing, use null or 0 as appropriate.`;

function validatePrescriptionResult(parsed) {
  if (!parsed?.medicines?.length) {
    throw new Error('Could not extract medicines from prescription');
  }
  return parsed;
}

export async function parsePrescription(textOrDescription) {
  const content = await callOpenRouter([
    { role: 'system', content: PRESCRIPTION_PROMPT },
    {
      role: 'user',
      content: `Parse this prescription:\n\n${textOrDescription}`,
    },
  ]);

  return validatePrescriptionResult(parseJsonFromAI(content));
}

export async function parsePrescriptionFromImages(images, supplementalText) {
  const hint = supplementalText ? `\n\nAdditional text extracted from document:\n${supplementalText}` : '';
  const pageNote = images.length > 1 ? ` This prescription has ${images.length} pages — read ALL pages.` : '';

  const content = await callOpenRouterVision(
    PRESCRIPTION_PROMPT,
    `Read this prescription document carefully. Extract ALL medicines, dosages, doctor name, hospital, and dates.${pageNote}${hint}\n\nReturn structured JSON only.`,
    images
  );

  return validatePrescriptionResult(parseJsonFromAI(content));
}

export async function parsePrescriptionInput({ text, images, imageBase64, mimeType }) {
  const imageList =
    images?.length > 0
      ? images
      : imageBase64
        ? [{ base64: imageBase64, mimeType: mimeType || 'image/png' }]
        : [];

  if (imageList.length > 0) {
    try {
      return await parsePrescriptionFromImages(imageList, text);
    } catch (visionErr) {
      if (text?.trim()) {
        try {
          return await parsePrescription(text);
        } catch {
          throw visionErr;
        }
      }
      throw visionErr;
    }
  }

  if (text?.trim()) {
    return await parsePrescription(text);
  }

  throw new Error('No prescription content to parse');
}

const BILL_PROMPT = `You are a pharmacy bill parser for DoseWise healthcare app.
Extract purchase items from the bill text or description.
Return ONLY valid JSON:
{
  "pharmacy": "string or null",
  "purchaseDate": "YYYY-MM-DD or null",
  "totalAmount": number or null,
  "items": [
    {
      "medicineName": "string",
      "strength": "string",
      "quantity": number,
      "batchNumber": "string or null",
      "expiryDate": "YYYY-MM-DD or null",
      "unitPrice": number or null
    }
  ]
}`;

function validateBillResult(parsed) {
  if (!parsed?.items?.length) {
    throw new Error('Could not extract items from bill');
  }
  return parsed;
}

export async function parseBill(textOrDescription) {
  const content = await callOpenRouter([
    { role: 'system', content: BILL_PROMPT },
    {
      role: 'user',
      content: `Parse this pharmacy bill:\n\n${textOrDescription}`,
    },
  ]);

  return validateBillResult(parseJsonFromAI(content));
}

export async function parseBillFromImages(images, supplementalText) {
  const hint = supplementalText ? `\n\nAdditional text extracted:\n${supplementalText}` : '';
  const content = await callOpenRouterVision(
    BILL_PROMPT,
    `Read this pharmacy bill carefully. Extract all medicine items, quantities, pharmacy name, and dates.${hint}\n\nReturn structured JSON only.`,
    images
  );

  return validateBillResult(parseJsonFromAI(content));
}

export async function parseBillInput({ text, images, imageBase64, mimeType }) {
  const imageList =
    images?.length > 0
      ? images
      : imageBase64
        ? [{ base64: imageBase64, mimeType: mimeType || 'image/png' }]
        : [];

  if (imageList.length > 0) {
    try {
      return await parseBillFromImages(imageList, text);
    } catch (visionErr) {
      if (text?.trim()) {
        try {
          return await parseBill(text);
        } catch {
          throw visionErr;
        }
      }
      throw visionErr;
    }
  }

  if (text?.trim()) {
    return await parseBill(text);
  }

  throw new Error('No bill content to parse');
}

export async function checkDrugInteractions(existingMedicines, newMedicines) {
  const content = await callOpenRouter([
    {
      role: 'system',
      content: `You are a pharmacology assistant. Check for drug interactions.
Return ONLY valid JSON:
{
  "hasInteractions": boolean,
  "interactions": [
    {
      "drugs": ["Drug A", "Drug B"],
      "severity": "mild|moderate|severe",
      "description": "string"
    }
  ],
  "summary": "string"
}`,
    },
    {
      role: 'user',
      content: `Existing medicines: ${existingMedicines.join(', ')}\nNew medicines: ${newMedicines.join(', ')}\nCheck interactions.`,
    },
  ]);

  return parseJsonFromAI(content) || { hasInteractions: false, interactions: [], summary: 'Unable to analyze' };
}

function buildInventoryTable(inventory = []) {
  if (!inventory.length) return '';
  const rows = inventory
    .map((i) => `| ${i.name} | ${i.daysLeft ?? 'N/A'} |`)
    .join('\n');
  return `Medicine Inventory\n| Medicine | Days Left |\n${rows}`;
}

function normalizeJegoReply(reply, context) {
  let text = String(reply || '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*/g, '');

  const hasInventory = context.inventory?.length > 0;
  const mentionsInventory = /inventory|days?\s*left|tablets?\s*left|stock|refill|run\s*out/i.test(text);

  if (hasInventory && mentionsInventory && !text.includes('| Medicine |')) {
    const intro = text.split('\n')[0]?.trim() || 'Here is the current medicine inventory.';
    const summary = text.includes('\n')
      ? text
          .split('\n')
          .filter((l) => l.trim() && !l.includes('|') && !/^(TAB\.|CAP\.|CARCA)/i.test(l.trim()))
          .slice(-2)
          .join(' ')
      : '';
    text = `${intro}\n\n${buildInventoryTable(context.inventory)}${summary ? `\n\n${summary}` : ''}`;
  }

  return text.trim();
}

export async function healthAssistantChat(message, context) {
  const systemPrompt = `You are Jego — DoseWise's friendly health assistant.
You help patients and caregivers understand medicines, dosages, and inventory.

IMPORTANT: Never diagnose conditions. Always recommend consulting a doctor for medical decisions.

RESPONSE FORMAT (strict — follow every time):
- Never use asterisks (*), hashtags (#), bullet symbols, or markdown bold/italic.
- Never use numbered lists when listing 3 or more comparable items — use a pipe table instead.
- Put a short plain-text intro sentence, then a clear section heading on its own line (e.g. "Medicine Inventory"), then a markdown pipe table:

Medicine Inventory
| Medicine | Days Left |
| CARCA CR | 6 |
| TAB.BRILINTA | 6 |

- For two-column data use headers like: Medicine | Days Left, Medicine | Quantity, Medicine | Schedule, etc.
- End with a brief plain-text summary paragraph (no asterisks).
- Keep headings short and professional.

Patient: ${context.patientName || 'Unknown'}
Medical conditions: ${context.medicalConditions?.join(', ') || 'None listed'}
Allergies: ${context.allergies?.join(', ') || 'None listed'}
Current medicines: ${JSON.stringify(context.medicines || [])}
Inventory: ${JSON.stringify(context.inventory || [])}
Adherence rate: ${context.adherenceRate ?? 'N/A'}%`;

  const raw = await callOpenRouter(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ],
    { temperature: 0.5 }
  );

  return normalizeJegoReply(raw, context);
}

export async function predictRefill(inventoryItem) {
  const daysRemaining =
    inventoryItem.dailyUsage > 0
      ? Math.floor(inventoryItem.availableQuantity / inventoryItem.dailyUsage)
      : null;

  const exhaustionDate = daysRemaining
    ? new Date(Date.now() + daysRemaining * 86400000)
    : null;

  return {
    currentStock: inventoryItem.availableQuantity,
    dailyUsage: inventoryItem.dailyUsage,
    daysRemaining,
    exhaustionDate,
    refillRecommendedDate: daysRemaining
      ? new Date(Date.now() + Math.max(0, daysRemaining - 3) * 86400000)
      : null,
    missedRefillProbability: daysRemaining !== null && daysRemaining <= 3 ? 'high' : daysRemaining <= 7 ? 'medium' : 'low',
  };
}
