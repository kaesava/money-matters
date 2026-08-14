/**
 * Bank Statement CSV Parser & Auto-Categorization Engine
 * 
 * Supports Australian Big 4 Banks (CBA, Westpac, ANZ, NAB) plus ING and Macquarie.
 * Auto-detects bank format based on header signatures, normalizes amounts and dates,
 * generates deduplication idempotency keys, and matches merchant keywords to categories.
 */
import { z } from "zod";

export interface ParsedCsvTransaction {
  date: string; // YYYY-MM-DD
  description: string;
  amount: string; // positive string e.g. "45.20"
  flowType: "DEBIT" | "CREDIT";
  suggestedCategoryName: string | null;
  idempotencyKey: string;
  rawBank: string;
}

export interface CustomColumnMapping {
  dateColIndex: number;
  descColIndex: number;
  amountColIndex: number;
  debitColIndex?: number;
  creditColIndex?: number;
}

export const BankCsvImportInputSchema = z.object({
  csvText: z.string().min(1),
  bankAccountId: z.string().uuid().optional(),
  customMapping: z.object({
    dateColIndex: z.number().int().min(0),
    descColIndex: z.number().int().min(0),
    amountColIndex: z.number().int().min(0),
    debitColIndex: z.number().int().min(0).optional(),
    creditColIndex: z.number().int().min(0).optional(),
  }).optional(),
}).strict();

export type BankCsvImportInput = z.infer<typeof BankCsvImportInputSchema>;

/**
 * Keyword-to-category name auto-matching dictionary for Australian merchants.
 */
const CATEGORY_KEYWORD_MAP: Array<{ keywords: string[]; categoryName: string }> = [
  { keywords: ["woolworths", "coles", "aldi", "iga", "harris farm"], categoryName: "Groceries & Food Supplies" },
  { keywords: ["agl", "origin", "energyaustralia", "red energy"], categoryName: "Electricity & Gas (AGL)" },
  { keywords: ["aussie broadband", "telstra", "optus", "belong", "tpg"], categoryName: "NBN Broadband (Aussie Broadband)" },
  { keywords: ["bupa", "medibank", "hcf", "nib"], categoryName: "Private Health Insurance (Bupa)" },
  { keywords: ["netflix", "spotify", "disney", "youtube", "apple.com/bill", "prime video"], categoryName: "Streaming & Subscriptions" },
  { keywords: ["ampol", "bp ", "caltex", "7-eleven", "shell", "united petrol"], categoryName: "Everyday Spending & Discretionary" },
  { keywords: ["uber", "didi", "transport for nsw", "opal", "myki"], categoryName: "Everyday Spending & Discretionary" },
];

/**
 * Generates a deterministic hash string from transaction parameters for deduplication.
 */
function generateTransactionHash(date: string, amount: string, description: string, flowType: string): string {
  const cleanDesc = description.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30);
  return `csv-import-${date}-${flowType}-${amount}-${cleanDesc}`;
}

/**
 * Simple CSV line tokenizer that respects quoted values.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

/**
 * Normalizes date string into YYYY-MM-DD.
 * Supports DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY formats.
 */
function normalizeDate(rawDate: string): string {
  const cleaned = rawDate.replace(/"/g, "").trim();
  
  // DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleaned)) {
    const [d, m, y] = cleaned.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }
  // DD-MM-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(cleaned)) {
    const [d, m, y] = cleaned.split("-");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Fallback to today if unparseable
  return new Date().toISOString().split("T")[0];
}

/**
 * Main parser entrypoint. Identifies CSV structure and returns clean parsed records.
 */
export function parseBankCsv(
  csvContent: string,
  customMapping?: CustomColumnMapping
): { bank: string; transactions: ParsedCsvTransaction[]; headers: string[] } {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { bank: "Unknown", transactions: [], headers: [] };
  }

  const rawHeaders = parseCsvLine(lines[0]);
  const header = lines[0].toLowerCase();
  let bankName = "Generic CSV";

  if (customMapping) {
    bankName = "Custom Mapped CSV";
  } else if (header.includes("cba") || (header.includes("date") && header.includes("amount") && header.includes("balance") && !header.includes("debit"))) {
    bankName = "Commonwealth Bank (CBA)";
  } else if (header.includes("narrative") || header.includes("bank account")) {
    bankName = "Westpac";
  } else if (header.includes("code") && header.includes("description")) {
    bankName = "NAB";
  } else if (header.includes("credit") && header.includes("debit")) {
    bankName = "ING / ANZ";
  } else if (header.includes("trade date")) {
    bankName = "Macquarie";
  }

  const transactions: ParsedCsvTransaction[] = [];
  const startRow = lines[0].includes("Date") || lines[0].includes("date") ? 1 : 0;

  for (let i = startRow; i < lines.length; i++) {
    const tokens = parseCsvLine(lines[i]);
    if (tokens.length < 2) continue;

    let rawDate = "";
    let rawDesc = "";
    let rawAmount = "";
    let flowType: "DEBIT" | "CREDIT" = "DEBIT";

    if (customMapping) {
      rawDate = tokens[customMapping.dateColIndex] || "";
      rawDesc = tokens[customMapping.descColIndex] || "";
      
      if (customMapping.debitColIndex !== undefined && customMapping.creditColIndex !== undefined) {
        const debit = (tokens[customMapping.debitColIndex] || "").replace(/[$,]/g, "");
        const credit = (tokens[customMapping.creditColIndex] || "").replace(/[$,]/g, "");
        if (credit && parseFloat(credit) > 0) {
          flowType = "CREDIT";
          rawAmount = credit;
        } else {
          flowType = "DEBIT";
          rawAmount = debit.replace("-", "");
        }
      } else {
        rawAmount = tokens[customMapping.amountColIndex] || "";
        const numVal = parseFloat(rawAmount.replace(/[$,]/g, ""));
        if (!isNaN(numVal)) {
          flowType = numVal >= 0 ? "CREDIT" : "DEBIT";
          rawAmount = Math.abs(numVal).toFixed(2);
        }
      }
    } else if (tokens.length >= 3) {
      // General structure: Date, Description/Narrative, Amount (or Debit/Credit columns)
      rawDate = tokens[0];
      
      // Westpac: Bank Account, Date, Narrative, Debit Amount, Credit Amount, Balance
      if (bankName === "Westpac" && tokens.length >= 5) {
        rawDate = tokens[1];
        rawDesc = tokens[2];
        const debit = tokens[3].replace(/[$,]/g, "");
        const credit = tokens[4].replace(/[$,]/g, "");
        if (credit && parseFloat(credit) > 0) {
          flowType = "CREDIT";
          rawAmount = credit;
        } else {
          flowType = "DEBIT";
          rawAmount = debit.replace("-", "");
        }
      } 
      // ING / ANZ 2-column amounts: Date, Description, Credit, Debit
      else if (bankName === "ING / ANZ" || (tokens.length >= 4 && !isNaN(parseFloat(tokens[2])) && !isNaN(parseFloat(tokens[3])))) {
        rawDesc = tokens[1];
        const credit = tokens[2].replace(/[$,]/g, "");
        const debit = tokens[3].replace(/[$,]/g, "");
        if (credit && parseFloat(credit) > 0) {
          flowType = "CREDIT";
          rawAmount = credit;
        } else {
          flowType = "DEBIT";
          rawAmount = debit.replace("-", "");
        }
      }
      // Single amount column (CBA, NAB, Generic): Date, Amount, Description / Date, Description, Amount
      else {
        // Find monetary token
        const secondIsNum = !isNaN(parseFloat(tokens[1].replace(/[$,-]/g, "")));
        if (secondIsNum) {
          rawAmount = tokens[1];
          rawDesc = tokens.length === 4 && !isNaN(parseFloat(tokens[3].replace(/[$,-]/g, ""))) ? tokens[2] : tokens.slice(2).join(" ");
        } else {
          rawDesc = tokens[1];
          rawAmount = tokens[2];
        }

        const numVal = parseFloat(rawAmount.replace(/[$,]/g, ""));
        if (!isNaN(numVal)) {
          flowType = numVal >= 0 ? "CREDIT" : "DEBIT";
          rawAmount = Math.abs(numVal).toFixed(2);
        }
      }
    }

    if (!rawAmount || isNaN(parseFloat(rawAmount))) continue;

    const formattedDate = normalizeDate(rawDate);
    const cleanDesc = rawDesc.replace(/^"|"$/g, "").trim() || "Imported Transaction";
    const amountVal = parseFloat(rawAmount).toFixed(2);

    // Auto-match category keyword
    let suggestedCategoryName: string | null = null;
    const lowerDesc = cleanDesc.toLowerCase();
    for (const item of CATEGORY_KEYWORD_MAP) {
      if (item.keywords.some((kw) => lowerDesc.includes(kw))) {
        suggestedCategoryName = item.categoryName;
        break;
      }
    }

    const idempotencyKey = generateTransactionHash(formattedDate, amountVal, cleanDesc, flowType);

    transactions.push({
      date: formattedDate,
      description: cleanDesc,
      amount: amountVal,
      flowType,
      suggestedCategoryName,
      idempotencyKey,
      rawBank: bankName,
    });
  }

  return { bank: bankName, transactions, headers: rawHeaders };
}

