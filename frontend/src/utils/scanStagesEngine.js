/**
 * scanStagesEngine.js - State Machine & Duration Coordinator for TrueTax AI ScanConversion
 * 
 * Enforces minimum stage durations so the scanning animation never flashes past too quickly,
 * while staying synchronized with the real backend pipeline.
 */

export const STAGE_CONFIG = [
  {
    id: 0,
    key: 'capture',
    label: 'Capture & Prep',
    minDuration: 500,
    ariaText: 'Photo captured · Preparing bill preview',
  },
  {
    id: 1,
    key: 'shadow_removal',
    label: 'Shadow removal',
    tech: 'OpenCV CLAHE',
    minDuration: 700,
    ariaText: 'Removing shadows and enhancing contrast with OpenCV CLAHE',
  },
  {
    id: 2,
    key: 'ocr',
    label: 'Vernacular OCR',
    tech: 'Gemini Vision',
    minDuration: 700,
    ariaText: 'Reading handwritten text with Vernacular OCR',
  },
  {
    id: 3,
    key: 'hsn_audit',
    label: 'HSN Match & Tax Audit',
    tech: 'PyTorch + Tax Engine',
    minDuration: 700,
    ariaText: 'Matching statutory HSN codes and auditing GST arithmetic',
  },
  {
    id: 4,
    key: 'seal',
    label: 'Pakka Tax Invoice',
    tech: 'GSTN v3.1 Sealed',
    minDuration: 900,
    ariaText: 'Bill converted · Pakka Tax Invoice sealed and verified',
  },
];

/**
 * Calculates normalized overall progress from 0.0 to 1.0 based on stage (0-4)
 */
export function calculateProgress(stage, stageElapsedMs = 0, isDone = false) {
  if (isDone || stage >= 4) return 1.0;
  if (stage < 0) return 0.0;

  const currentConfig = STAGE_CONFIG[stage];
  const stageBase = stage * 0.22; // 0: 0%, 1: 22%, 2: 44%, 3: 66%, 4: 88%
  const intraProgress = Math.min(stageElapsedMs / (currentConfig?.minDuration || 700), 1.0) * 0.22;
  return Math.min(Math.round((stageBase + intraProgress) * 100) / 100, 0.98);
}

/**
 * Checks whether stage can advance to next stage
 */
export function canAdvanceStage(currentStage, backendStep = 1, backendDone = false, isDemo = false) {
  if (currentStage >= 4) return false;
  if (isDemo || backendDone) return true;

  // Real backend steps:
  // Step 1 corresponds to Stage 1
  // Step 2 corresponds to Stage 2
  // Step 3 corresponds to Stage 3
  // Step 4 corresponds to Stage 4
  switch (currentStage) {
    case 0:
      return true; // Stage 0 (capture) advances to Stage 1 once min duration finishes
    case 1:
      return backendStep >= 2;
    case 2:
      return backendStep >= 3;
    case 3:
      return backendStep >= 4 || backendDone;
    default:
      return false;
  }
}

/**
 * Helper to get clean display totals for Stage 4 count-up animation
 */
export function getStageTotals(result) {
  if (!result) {
    return {
      taxable: 2075.00,
      gst: 143.75,
      finalTotal: 2218.75,
      itemCount: 4,
      discrepancyCount: 1,
    };
  }

  const taxable =
    result.summary?.audited_taxable_total ??
    result.totals?.audited_taxable_total ??
    result.active_items?.reduce((s, it) => s + (it.audited_line_total ?? it.written_line_total ?? 0), 0) ??
    2075.00;

  const totalCgst = result.summary?.total_cgst ?? result.totals?.total_cgst ?? 0;
  const totalSgst = result.summary?.total_sgst ?? result.totals?.total_sgst ?? 0;
  const totalIgst = result.summary?.total_igst ?? result.totals?.total_igst ?? 0;
  const gst = totalCgst + totalSgst + totalIgst || (taxable * 0.05);

  const finalTotal =
    result.summary?.final_payable_pakka_total ??
    result.totals?.final_payable_pakka_total ??
    (taxable + gst);

  const itemCount = result.active_items?.length || 4;
  const discrepancyCount =
    result.active_items?.filter((it) => it.has_math_error)?.length ?? 0;

  return {
    taxable,
    gst,
    finalTotal,
    itemCount,
    discrepancyCount,
  };
}

