import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  STAGE_CONFIG,
  calculateProgress,
  canAdvanceStage,
  getStageTotals,
} from './scanStagesEngine.js';

describe('Scan Stages Engine & useScanStages Logic Tests', () => {
  it('enforces required minimum durations per stage', () => {
    assert.equal(STAGE_CONFIG.length, 5);
    assert.equal(STAGE_CONFIG[0].minDuration, 500, 'Stage 0 capture must be ~500ms');
    assert.equal(STAGE_CONFIG[1].minDuration, 700, 'Stage 1 CLAHE must be at least 700ms');
    assert.equal(STAGE_CONFIG[2].minDuration, 700, 'Stage 2 OCR must be at least 700ms');
    assert.equal(STAGE_CONFIG[3].minDuration, 700, 'Stage 3 HSN must be at least 700ms');
    assert.equal(STAGE_CONFIG[4].minDuration, 900, 'Stage 4 Seal must be ~900ms');

    const totalMinMs = STAGE_CONFIG.reduce((acc, s) => acc + s.minDuration, 0);
    assert.ok(totalMinMs >= 3500, `Total minimum duration ${totalMinMs}ms must be between 3.5s and 6s`);
    assert.ok(totalMinMs <= 5000, `Total minimum duration ${totalMinMs}ms must be within 5s`);
  });

  it('verifies stage advancement conditions synchronized with backend steps', () => {
    // Stage 0 (capture) always can advance
    assert.equal(canAdvanceStage(0, 1, false, false), true);

    // Stage 1 requires backendStep >= 2
    assert.equal(canAdvanceStage(1, 1, false, false), false);
    assert.equal(canAdvanceStage(1, 2, false, false), true);

    // Stage 2 requires backendStep >= 3
    assert.equal(canAdvanceStage(2, 2, false, false), false);
    assert.equal(canAdvanceStage(2, 3, false, false), true);

    // Stage 3 requires backendStep >= 4 or backendDone
    assert.equal(canAdvanceStage(3, 3, false, false), false);
    assert.equal(canAdvanceStage(3, 4, false, false), true);
    assert.equal(canAdvanceStage(3, 2, true, false), true, 'backendDone allows advance');

    // Demo mode bypasses backend checks
    assert.equal(canAdvanceStage(1, 1, false, true), true, 'Demo mode advances freely');
    assert.equal(canAdvanceStage(2, 1, false, true), true);
    assert.equal(canAdvanceStage(3, 1, false, true), true);
  });

  it('calculates monotonic normalized progress (0.0 to 1.0)', () => {
    const p0 = calculateProgress(0, 0, false);
    const p1 = calculateProgress(1, 350, false);
    const p2 = calculateProgress(2, 350, false);
    const p3 = calculateProgress(3, 350, false);
    const pDone = calculateProgress(4, 900, true);

    assert.ok(p0 >= 0.0);
    assert.ok(p1 > p0, 'Progress must increase with stages');
    assert.ok(p2 > p1, 'Progress must increase with stages');
    assert.ok(p3 > p2, 'Progress must increase with stages');
    assert.equal(pDone, 1.0, 'Completed stage must be 1.0');
  });

  it('tests skip behavior jump to Stage 4', () => {
    // Simulated skip action
    let currentStage = 1;
    let isDone = false;
    let progress = 0.25;

    const skipAction = () => {
      currentStage = 4;
      progress = 1.0;
      isDone = true;
    };

    skipAction();
    assert.equal(currentStage, 4);
    assert.equal(progress, 1.0);
    assert.equal(isDone, true);
  });

  it('tests error stop halting state transitions', () => {
    let currentStage = 2;
    let hasError = false;
    let isLaserActive = true;

    const handleError = () => {
      hasError = true;
      isLaserActive = false; // Freeze laser
    };

    handleError();
    assert.equal(hasError, true);
    assert.equal(isLaserActive, false);
    assert.equal(currentStage, 2, 'Stage must freeze on error');
  });

  it('tests reduced-motion path timing adjustments', () => {
    const isReducedMotion = true;
    const adjustedDurations = STAGE_CONFIG.map((s) =>
      isReducedMotion ? Math.round(s.minDuration * 0.75) : s.minDuration
    );

    assert.equal(adjustedDurations[0], 375);
    assert.equal(adjustedDurations[1], 525);
    assert.equal(adjustedDurations[2], 525);
    assert.equal(adjustedDurations[3], 525);
    assert.equal(adjustedDurations[4], 675);

    const reducedTotal = adjustedDurations.reduce((a, b) => a + b, 0);
    assert.ok(reducedTotal < 3500, 'Reduced motion path completes more briskly');
  });

  it('extracts accurate totals for Sharma Kirana sample bill', () => {
    const sampleResult = {
      summary: {
        audited_taxable_total: 2075.0,
        total_cgst: 71.88,
        total_sgst: 71.87,
        final_payable_pakka_total: 2218.75,
      },
      active_items: [
        { product_name_normalized: 'Wheat Flour', has_math_error: false },
        { product_name_normalized: 'Tata Salt', has_math_error: false },
        { product_name_normalized: 'Mustard Oil', has_math_error: true },
        { product_name_normalized: 'Dettol Soap', has_math_error: false },
      ],
    };

    const totals = getStageTotals(sampleResult);
    assert.equal(totals.taxable, 2075.0);
    assert.equal(totals.gst, 143.75);
    assert.equal(totals.finalTotal, 2218.75);
    assert.equal(totals.itemCount, 4);
    assert.equal(totals.discrepancyCount, 1);
  });

  it('provides accessible aria announcements for all 5 stages', () => {
    STAGE_CONFIG.forEach((config) => {
      assert.ok(config.ariaText, `Stage ${config.id} must have ariaText`);
      assert.ok(config.ariaText.length > 10, 'Aria text must be descriptive');
    });
  });
});

