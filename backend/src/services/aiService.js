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

export async function parsePrescriptionFromImage(imageBase64, mimeType, supplementalText) {
  const hint = supplementalText ? `\n\nAdditional text extracted:\n${supplementalText}` : '';
  const content = await callOpenRouterVision(
    PRESCRIPTION_PROMPT,
    `Read this prescription document image carefully. Extract all medicines, dosages, doctor name, hospital, and dates.${hint}\n\nReturn structured JSON only.`,
    imageBase64,
    mimeType
  );

  return validatePrescriptionResult(parseJsonFromAI(content));
}

export async function parsePrescriptionInput({ text, imageBase64, mimeType }) {
  if (imageBase64) {
    return parsePrescriptionFromImage(imageBase64, mimeType, text);
  }
  if (text?.trim()) {
    return parsePrescription(text);
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

export async function parseBillFromImage(imageBase64, mimeType, supplementalText) {
  const hint = supplementalText ? `\n\nAdditional text extracted:\n${supplementalText}` : '';
  const content = await callOpenRouterVision(
    BILL_PROMPT,
    `Read this pharmacy bill image carefully. Extract all medicine items, quantities, pharmacy name, and dates.${hint}\n\nReturn structured JSON only.`,
    imageBase64,
    mimeType
  );

  return validateBillResult(parseJsonFromAI(content));
}

export async function parseBillInput({ text, imageBase64, mimeType }) {
  if (imageBase64) {
    return parseBillFromImage(imageBase64, mimeType, text);
  }
  if (text?.trim()) {
    return parseBill(text);
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

export async function healthAssistantChat(message, context) {
  const systemPrompt = `You are DoseWise AI Health Assistant — a helpful, cautious medical information assistant.
You help patients understand their medicines, dosages, and inventory.
IMPORTANT: Never diagnose conditions. Always recommend consulting a doctor for medical decisions.
Use the patient's context when answering:

Patient: ${context.patientName || 'Unknown'}
Medical conditions: ${context.medicalConditions?.join(', ') || 'None listed'}
Allergies: ${context.allergies?.join(', ') || 'None listed'}
Current medicines: ${JSON.stringify(context.medicines || [])}
Inventory: ${JSON.stringify(context.inventory || [])}
Adherence rate: ${context.adherenceRate ?? 'N/A'}%`;

  return callOpenRouter(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ],
    { temperature: 0.5 }
  );
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
