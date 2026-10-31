/**
 * Realistic Mock Datasets & SVG Receipt Visuals for Demo & Offline Testing
 */

function generateReceiptSvg(title, items, isEnhanced = false) {
  const bg = isEnhanced ? '#FFFFFF' : '#F7F3E8';
  const ink = isEnhanced ? '#0B0F19' : '#1E293B';
  const paperBorder = isEnhanced ? '#E2E8F0' : '#D5C4A1';
  const shadow = isEnhanced ? '' : '<rect x="0" y="0" width="400" height="600" fill="url(#shadowGrad)" opacity="0.35"/>';
  
  const rows = items.map((item, idx) => {
    const y = 170 + idx * 36;
    if (item.struck) {
      return `
        <g opacity="0.6">
          <text x="30" y="${y}" font-family="monospace" font-size="13" fill="#DC2626">${item.text}</text>
          <text x="330" y="${y}" font-family="monospace" font-size="13" fill="#DC2626" text-anchor="end">${item.total}</text>
          <line x1="26" y1="${y-4}" x2="335" y2="${y-4}" stroke="#DC2626" stroke-width="2.2" stroke-linecap="round"/>
        </g>
      `;
    }
    return `
      <g>
        <text x="30" y="${y}" font-family="monospace" font-size="13" font-weight="600" fill="${ink}">${item.text}</text>
        <text x="330" y="${y}" font-family="monospace" font-size="13" font-weight="700" fill="${ink}" text-anchor="end">${item.total}</text>
      </g>
    `;
  }).join('');

  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
    <defs>
      <linearGradient id="shadowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#000" stop-opacity="0.35"/>
        <stop offset="40%" stop-color="#000" stop-opacity="0.1"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0.25"/>
      </linearGradient>
      <filter id="wrinkle">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise"/>
        <feDiffuseLighting in="noise" lighting-color="#fff" surfaceScale="1.2">
          <feDistantLight azimuth="45" elevation="60"/>
        </feDiffuseLighting>
        <feBlend mode="multiply" in="SourceGraphic"/>
      </filter>
    </defs>
    <rect x="10" y="10" width="380" height="580" rx="8" fill="${bg}" stroke="${paperBorder}" stroke-width="2"/>
    ${shadow}
    <!-- Receipt Header -->
    <text x="200" y="55" font-family="'Courier New', Courier, monospace" font-size="16" font-weight="bold" fill="${ink}" text-anchor="middle">${title.toUpperCase()}</text>
    <text x="200" y="78" font-family="'Courier New', Courier, monospace" font-size="11" fill="${ink}" text-anchor="middle" opacity="0.8">KACHA ESTIMATE / ESTIMATE BILL</text>
    <line x1="30" y1="95" x2="370" y2="95" stroke="${ink}" stroke-width="1.2" stroke-dasharray="4,3"/>
    
    <text x="30" y="120" font-family="monospace" font-size="11" fill="${ink}">DATE: 31/10/26</text>
    <text x="370" y="120" font-family="monospace" font-size="11" fill="${ink}" text-anchor="end">SLIP: #8841</text>
    <line x1="30" y1="135" x2="370" y2="135" stroke="${ink}" stroke-width="1"/>
    
    <!-- Items Table -->
    ${rows}
    
    <!-- Footer Line -->
    <line x1="30" y1="440" x2="370" y2="440" stroke="${ink}" stroke-width="1.2" stroke-dasharray="4,3"/>
    <text x="30" y="470" font-family="monospace" font-size="14" font-weight="bold" fill="${ink}">TOTAL AMOUNT:</text>
    <text x="370" y="470" font-family="monospace" font-size="15" font-weight="bold" fill="${ink}" text-anchor="end">KACHA TOTAL</text>
    <text x="200" y="520" font-family="monospace" font-size="10" fill="${ink}" text-anchor="middle" opacity="0.7">** SIGNATURE NOT REQUIRED - ESTIMATE ONLY **</text>
    <text x="200" y="540" font-family="monospace" font-size="9" fill="${ink}" text-anchor="middle" opacity="0.5">Scanned by TrueTax AI OpenCV CLAHE</text>
  </svg>`;
}

export const DEMO_PRESETS = [
  {
    id: 'kirana',
    title: 'Sharma Kirana Store',
    tag: 'Grocery & Spices',
    badge: 'Math Error + Struck Item',
    data: {
      invoice_id: 'INV-2026-2260',
      merchant_name: 'Sharma Kirana & General Store',
      buyer_name: 'Sharma Kirana & General Store',
      buyer_gstin: '07AAAAA0000A1Z4',
      pos: '07',
      buyer_state_code: '07',
      detected_sector: 'GROCERY',
      raw_date_written: '31 Oct 2026',
      normalized_date_iso: '2026-10-31',
      model_used: 'gemini-3.5-flash-lite',
      cache_hit: false,
      raw_image_base64: generateReceiptSvg('Sharma Kirana & General Store', [
        { text: 'Dedh peti Ashirvaad Atta @ 1200', total: '1800' },
        { text: 'Adha kilo Tata Namak @ 30', total: '15' },
        { text: '3 Pao Fortune Mustard Oil @ 180', total: '150 (WRONG)' },
        { text: '2 nag Dettol Soap Family Pack @ 160', total: '320' },
        { text: '2 kg Maida - 90', total: '90', struck: true },
      ], false),
      enhanced_image_base64: generateReceiptSvg('Sharma Kirana & General Store', [
        { text: 'Dedh peti Ashirvaad Atta @ 1200', total: '1800' },
        { text: 'Adha kilo Tata Namak @ 30', total: '15' },
        { text: '3 Pao Fortune Mustard Oil @ 180', total: '150 (WRONG)' },
        { text: '2 nag Dettol Soap Family Pack @ 160', total: '320' },
        { text: '2 kg Maida - 90', total: '90', struck: true },
      ], true),
      active_items: [
        {
          line_number: 1,
          raw_text_on_paper: 'Dedh peti Ashirvaad Atta @ 1200',
          product_name_normalized: 'Wheat Flour (Branded)',
          item_sector: 'GROCERY',
          raw_quantity: 'Dedh peti',
          quantity: 1.5,
          unit_uqc: 'BOX',
          unit_price: 1200.0,
          written_line_total: 1800.0,
          audited_line_total: 1800.0,
          has_math_error: false,
          math_discrepancy: 0.0,
          hsn_code: '1101',
          hsn_description: 'Wheat or Meslin Flour (Branded)',
          gst_rate: 5.0,
          cgst_rate: 2.5,
          sgst_rate: 2.5,
          cgst_amount: 45.0,
          sgst_amount: 45.0,
          final_line_total_with_gst: 1890.0,
          tax_rule_triggered: true,
          tax_rule_note: 'Dynamic Rule: Packaged/Branded Wheat Flour (5% GST)',
          confidence_score: 0.98,
          hsn_alternatives: [
            { hsn_code: '1101', description: 'Unbranded Loose Atta (0% GST)', gst_rate: 0.0 },
            { hsn_code: '1901', description: 'Pre-packaged Food Prep (18% GST)', gst_rate: 18.0 }
          ]
        },
        {
          line_number: 2,
          raw_text_on_paper: 'Adha kilo Tata Namak @ 30',
          product_name_normalized: 'Tata Salt (Iodized)',
          item_sector: 'GROCERY',
          raw_quantity: 'Adha kilo',
          quantity: 0.5,
          unit_uqc: 'KGS',
          unit_price: 30.0,
          written_line_total: 15.0,
          audited_line_total: 15.0,
          has_math_error: false,
          math_discrepancy: 0.0,
          hsn_code: '2501',
          hsn_description: 'Common Salt (Edible)',
          gst_rate: 0.0,
          cgst_rate: 0.0,
          sgst_rate: 0.0,
          cgst_amount: 0.0,
          sgst_amount: 0.0,
          final_line_total_with_gst: 15.0,
          tax_rule_note: 'Essential Staple Food: Exempt from GST (0%)',
          confidence_score: 0.99,
          hsn_alternatives: [
            { hsn_code: '2501', description: 'Industrial Chemical Salt (5% GST)', gst_rate: 5.0 }
          ]
        },
        {
          line_number: 3,
          raw_text_on_paper: '3 Pao Fortune Mustard Oil @ 180',
          product_name_normalized: 'Mustard Cooking Oil (Bottle)',
          item_sector: 'GROCERY',
          raw_quantity: '3 Pao (0.75 Ltr)',
          quantity: 0.75,
          unit_uqc: 'LTR',
          unit_price: 180.0,
          written_line_total: 150.0,
          audited_line_total: 135.0,
          has_math_error: true,
          math_discrepancy: 15.0,
          hsn_code: '1514',
          hsn_description: 'Mustard, Rape or Colza Oil',
          gst_rate: 5.0,
          cgst_rate: 2.5,
          sgst_rate: 2.5,
          cgst_amount: 3.38,
          sgst_amount: 3.38,
          final_line_total_with_gst: 141.76,
          tax_rule_note: null,
          confidence_score: 0.92,
          hsn_alternatives: [
            { hsn_code: '1514', description: 'Bulk Crude Mustard Oil (5% GST)', gst_rate: 5.0 },
            { hsn_code: '1517', description: 'Edible Vegetable Fats (12% GST)', gst_rate: 12.0 }
          ]
        },
        {
          line_number: 4,
          raw_text_on_paper: '2 nag Dettol Soap Family Pack @ 160',
          product_name_normalized: 'Antiseptic Bathing Soap',
          item_sector: 'GROCERY',
          raw_quantity: '2 nag',
          quantity: 2.0,
          unit_uqc: 'PCS',
          unit_price: 160.0,
          written_line_total: 320.0,
          audited_line_total: 320.0,
          has_math_error: false,
          math_discrepancy: 0.0,
          hsn_code: '3401',
          hsn_description: 'Organic Surface-Active Toilet Soap',
          gst_rate: 18.0,
          cgst_rate: 9.0,
          sgst_rate: 9.0,
          cgst_amount: 28.80,
          sgst_amount: 28.80,
          final_line_total_with_gst: 377.60,
          tax_rule_note: null,
          confidence_score: 0.95,
          hsn_alternatives: [
            { hsn_code: '3401', description: 'Medicinal / Medicated Soap (12% GST)', gst_rate: 12.0 }
          ]
        }
      ],
      struck_out_items: [
        {
          line_number: 5,
          raw_text_on_paper: '2 kg Maida - 90',
          reason: 'Visually crossed out on paper receipt — excluded from GST total'
        }
      ],
      summary: {
        written_grand_total: 2285.0,
        audited_taxable_subtotal: 2270.0,
        total_cgst: 77.18,
        total_sgst: 77.18,
        final_gst_payable_total: 2424.36,
        total_math_errors_caught: 1,
        total_struck_out_excluded: 1
      }
    }
  },
  {
    id: 'punjab_cloth',
    title: 'Punjab Cloth House',
    tag: 'Textiles & Garments',
    badge: '₹1,000 Apparel Tax Rule',
    data: {
      invoice_id: 'INV-2026-9104',
      merchant_name: 'Punjab Cloth & Readymade House',
      detected_sector: 'TEXTILES',
      raw_date_written: '31/10/26',
      normalized_date_iso: '2026-10-31',
      model_used: 'gemini-3.5-flash-lite',
      cache_hit: true,
      raw_image_base64: generateReceiptSvg('Punjab Cloth House', [
        { text: '1 Wedding Lehnga/Suit @ 2400', total: '2400' },
        { text: '4 mtr Cotton Kurti Fabric @ 180', total: '720' },
        { text: '1 Pure Silk Dupatta @ 1450', total: '1400 (WRONG)' },
        { text: '2 mtr Astar Kapda - 160 (cut)', total: '160', struck: true },
      ], false),
      enhanced_image_base64: generateReceiptSvg('Punjab Cloth House', [
        { text: '1 Wedding Lehnga/Suit @ 2400', total: '2400' },
        { text: '4 mtr Cotton Kurti Fabric @ 180', total: '720' },
        { text: '1 Pure Silk Dupatta @ 1450', total: '1400 (WRONG)' },
        { text: '2 mtr Astar Kapda - 160 (cut)', total: '160', struck: true },
      ], true),
      active_items: [
        {
          line_number: 1,
          raw_text_on_paper: '1 Wedding Lehnga/Suit @ 2400',
          product_name_normalized: 'Wedding Lehnga Suit (Stitched)',
          item_sector: 'TEXTILES',
          raw_quantity: '1 nag',
          quantity: 1.0,
          unit_uqc: 'PCS',
          unit_price: 2400.0,
          written_line_total: 2400.0,
          audited_line_total: 2400.0,
          has_math_error: false,
          math_discrepancy: 0.0,
          hsn_code: '6204',
          hsn_description: 'Women Suits & Ensembles (Apparel)',
          gst_rate: 12.0,
          cgst_rate: 6.0,
          sgst_rate: 6.0,
          cgst_amount: 144.0,
          sgst_amount: 144.0,
          final_line_total_with_gst: 2688.0,
          tax_rule_note: 'Garment > ₹1,000: Auto-upgraded from 5% to 12% GST',
          confidence_score: 0.94,
          hsn_alternatives: [
            { hsn_code: '6204', description: 'Readymade Suit (12% GST)', gst_rate: 12.0 },
            { hsn_code: '5208', description: 'Unstitched Cotton Fabric (5% GST)', gst_rate: 5.0 }
          ]
        },
        {
          line_number: 2,
          raw_text_on_paper: '4 mtr Cotton Kurti Fabric @ 180',
          product_name_normalized: 'Unstitched Cotton Voile Fabric',
          item_sector: 'TEXTILES',
          raw_quantity: '4 mtr',
          quantity: 4.0,
          unit_uqc: 'MTR',
          unit_price: 180.0,
          written_line_total: 720.0,
          audited_line_total: 720.0,
          has_math_error: false,
          math_discrepancy: 0.0,
          hsn_code: '5208',
          hsn_description: 'Woven Fabrics of Cotton',
          gst_rate: 5.0,
          cgst_rate: 2.5,
          sgst_rate: 2.5,
          cgst_amount: 18.0,
          sgst_amount: 18.0,
          final_line_total_with_gst: 756.0,
          tax_rule_note: null,
          confidence_score: 0.96,
          hsn_alternatives: [
            { hsn_code: '5208', description: 'Cotton Shirting (5% GST)', gst_rate: 5.0 }
          ]
        },
        {
          line_number: 3,
          raw_text_on_paper: '1 Pure Silk Dupatta @ 1450',
          product_name_normalized: 'Embroidered Silk Dupatta',
          item_sector: 'TEXTILES',
          raw_quantity: '1 nag',
          quantity: 1.0,
          unit_uqc: 'PCS',
          unit_price: 1450.0,
          written_line_total: 1400.0,
          audited_line_total: 1450.0,
          has_math_error: true,
          math_discrepancy: -50.0,
          hsn_code: '5007',
          hsn_description: 'Woven Fabrics of Silk or Silk Waste',
          gst_rate: 12.0,
          cgst_rate: 6.0,
          sgst_rate: 6.0,
          cgst_amount: 87.0,
          sgst_amount: 87.0,
          final_line_total_with_gst: 1624.0,
          tax_rule_note: 'Garment > ₹1,000: Auto-upgraded from 5% to 12% GST',
          confidence_score: 0.91,
          hsn_alternatives: [
            { hsn_code: '5007', description: 'Silk Shawl / Stole (12% GST)', gst_rate: 12.0 }
          ]
        }
      ],
      struck_out_items: [
        {
          line_number: 4,
          raw_text_on_paper: '2 mtr Astar Kapda - 160 (cut)',
          reason: 'Visually crossed out on paper receipt — excluded from GST total'
        }
      ],
      summary: {
        written_grand_total: 4520.0,
        audited_taxable_subtotal: 4570.0,
        total_cgst: 249.0,
        total_sgst: 249.0,
        final_gst_payable_total: 5068.0,
        total_math_errors_caught: 1,
        total_struck_out_excluded: 1
      }
    }
  },
  {
    id: 'gupta_hardware',
    title: 'Gupta Hardware & Paints',
    tag: 'Hardware & Construction',
    badge: '18% & 28% Dual Slabs',
    data: {
      invoice_id: 'INV-2026-7729',
      merchant_name: 'Gupta Hardware & Sanitary Store',
      detected_sector: 'HARDWARE',
      raw_date_written: '31/10/26',
      normalized_date_iso: '2026-10-31',
      model_used: 'gemini-3.5-flash-lite',
      cache_hit: false,
      raw_image_base64: generateReceiptSvg('Gupta Hardware', [
        { text: '2 Can Asian Paints Apex 4L @ 1650', total: '3300' },
        { text: '6 Brass Heavy Hinges 4 inch @ 120', total: '720' },
        { text: '1 Jaquar Pillar Cock Chrome @ 1850', total: '1850' },
        { text: '1 Fevicol Marine 1kg Pack @ 280', total: '250 (WRONG)' },
        { text: '10 nos SS Screws 1.5 in - 40', total: '40', struck: true },
      ], false),
      enhanced_image_base64: generateReceiptSvg('Gupta Hardware', [
        { text: '2 Can Asian Paints Apex 4L @ 1650', total: '3300' },
        { text: '6 Brass Heavy Hinges 4 inch @ 120', total: '720' },
        { text: '1 Jaquar Pillar Cock Chrome @ 1850', total: '1850' },
        { text: '1 Fevicol Marine 1kg Pack @ 280', total: '250 (WRONG)' },
        { text: '10 nos SS Screws 1.5 in - 40', total: '40', struck: true },
      ], true),
      active_items: [
        {
          line_number: 1,
          raw_text_on_paper: '2 Can Asian Paints Apex 4L @ 1650',
          product_name_normalized: 'Exterior Acrylic Paint 4L',
          item_sector: 'HARDWARE',
          raw_quantity: '2 can',
          quantity: 2.0,
          unit_uqc: 'CAN',
          unit_price: 1650.0,
          written_line_total: 3300.0,
          audited_line_total: 3300.0,
          has_math_error: false,
          math_discrepancy: 0.0,
          hsn_code: '3209',
          hsn_description: 'Paints and Varnishes (Aqueous Medium)',
          gst_rate: 18.0,
          cgst_rate: 9.0,
          sgst_rate: 9.0,
          cgst_amount: 297.0,
          sgst_amount: 297.0,
          final_line_total_with_gst: 3894.0,
          tax_rule_note: null,
          confidence_score: 0.97,
          hsn_alternatives: [
            { hsn_code: '3209', description: 'Wall Putty / Primer (18% GST)', gst_rate: 18.0 }
          ]
        },
        {
          line_number: 2,
          raw_text_on_paper: '6 Brass Heavy Hinges 4 inch @ 120',
          product_name_normalized: 'Brass Butt Door Hinges 4"',
          item_sector: 'HARDWARE',
          raw_quantity: '6 nag',
          quantity: 6.0,
          unit_uqc: 'PCS',
          unit_price: 120.0,
          written_line_total: 720.0,
          audited_line_total: 720.0,
          has_math_error: false,
          math_discrepancy: 0.0,
          hsn_code: '8302',
          hsn_description: 'Base Metal Mountings and Fittings for Doors',
          gst_rate: 18.0,
          cgst_rate: 9.0,
          sgst_rate: 9.0,
          cgst_amount: 64.8,
          sgst_amount: 64.8,
          final_line_total_with_gst: 849.6,
          tax_rule_note: null,
          confidence_score: 0.95,
          hsn_alternatives: [
            { hsn_code: '8302', description: 'Door Closers & Handles (18% GST)', gst_rate: 18.0 }
          ]
        },
        {
          line_number: 3,
          raw_text_on_paper: '1 Jaquar Pillar Cock Chrome @ 1850',
          product_name_normalized: 'Sanitary Brass Water Tap (Chrome)',
          item_sector: 'HARDWARE',
          raw_quantity: '1 piece',
          quantity: 1.0,
          unit_uqc: 'PCS',
          unit_price: 1850.0,
          written_line_total: 1850.0,
          audited_line_total: 1850.0,
          has_math_error: false,
          math_discrepancy: 0.0,
          hsn_code: '8481',
          hsn_description: 'Taps, Cocks, Valves for Pipes & Tanks',
          gst_rate: 18.0,
          cgst_rate: 9.0,
          sgst_rate: 9.0,
          cgst_amount: 166.5,
          sgst_amount: 166.5,
          final_line_total_with_gst: 2183.0,
          tax_rule_note: null,
          confidence_score: 0.98,
          hsn_alternatives: [
            { hsn_code: '8481', description: 'Luxury Shower Fittings (18% GST)', gst_rate: 18.0 }
          ]
        },
        {
          line_number: 4,
          raw_text_on_paper: '1 Fevicol Marine 1kg Pack @ 280',
          product_name_normalized: 'Waterproof Wood Adhesive 1kg',
          item_sector: 'HARDWARE',
          raw_quantity: '1 kg',
          quantity: 1.0,
          unit_uqc: 'KG',
          unit_price: 280.0,
          written_line_total: 250.0,
          audited_line_total: 280.0,
          has_math_error: true,
          math_discrepancy: -30.0,
          hsn_code: '3506',
          hsn_description: 'Prepared Glues and Other Prepared Adhesives',
          gst_rate: 18.0,
          cgst_rate: 9.0,
          sgst_rate: 9.0,
          cgst_amount: 25.2,
          sgst_amount: 25.2,
          final_line_total_with_gst: 330.4,
          tax_rule_note: null,
          confidence_score: 0.94,
          hsn_alternatives: [
            { hsn_code: '3506', description: 'Synthetic Resin Glue (18% GST)', gst_rate: 18.0 }
          ]
        }
      ],
      struck_out_items: [
        {
          line_number: 5,
          raw_text_on_paper: '10 nos SS Screws 1.5 in - 40',
          reason: 'Scratched out by pencil — customer cancelled before billing'
        }
      ],
      summary: {
        written_grand_total: 6120.0,
        audited_taxable_subtotal: 6150.0,
        total_cgst: 553.5,
        total_sgst: 553.5,
        final_gst_payable_total: 7257.0,
        total_math_errors_caught: 1,
        total_struck_out_excluded: 1
      }
    }
  }
];

export const COMMON_HSN_CODES = [
  { hsn: '1101', description: 'Wheat or Meslin Flour (Atta)', rate: 5, sector: 'GROCERY' },
  { hsn: '1006', description: 'Rice (Basmati & Non-Basmati)', rate: 5, sector: 'GROCERY' },
  { hsn: '2501', description: 'Common Salt (Edible)', rate: 0, sector: 'GROCERY' },
  { hsn: '1514', description: 'Mustard, Rape or Colza Oil', rate: 5, sector: 'GROCERY' },
  { hsn: '0402', description: 'Milk and Cream (Concentrated / Powder)', rate: 5, sector: 'GROCERY' },
  { hsn: '0902', description: 'Tea (Flavoured or Not)', rate: 5, sector: 'GROCERY' },
  { hsn: '1701', description: 'Cane or Beet Sugar', rate: 5, sector: 'GROCERY' },
  { hsn: '3401', description: 'Organic Surface-Active Toilet Soap', rate: 18, sector: 'GROCERY' },
  
  { hsn: '6204', description: 'Women Suits, Ensembles, Skirts', rate: 12, sector: 'TEXTILES' },
  { hsn: '6203', description: 'Men Suits, Jackets, Trousers', rate: 12, sector: 'TEXTILES' },
  { hsn: '5208', description: 'Woven Fabrics of Cotton', rate: 5, sector: 'TEXTILES' },
  { hsn: '5007', description: 'Woven Fabrics of Silk', rate: 12, sector: 'TEXTILES' },
  { hsn: '6109', description: 'T-Shirts, Singlets, Vests (Knitted)', rate: 12, sector: 'TEXTILES' },
  { hsn: '6403', description: 'Footwear with Outer Soles of Leather', rate: 12, sector: 'FOOTWEAR' },

  { hsn: '3209', description: 'Paints and Varnishes (Aqueous)', rate: 18, sector: 'HARDWARE' },
  { hsn: '8302', description: 'Base Metal Mountings and Hinges', rate: 18, sector: 'HARDWARE' },
  { hsn: '8481', description: 'Taps, Cocks, Valves for Pipes', rate: 18, sector: 'HARDWARE' },
  { hsn: '3506', description: 'Prepared Glues & Adhesives', rate: 18, sector: 'HARDWARE' },
  { hsn: '7318', description: 'Screws, Bolts, Nuts, Rivets of Iron/Steel', rate: 18, sector: 'HARDWARE' },

  { hsn: '8528', description: 'Monitors, Projectors, Televisions', rate: 18, sector: 'ELECTRONICS' },
  { hsn: '8517', description: 'Mobile Phones, Routers, Headsets', rate: 18, sector: 'ELECTRONICS' },
  { hsn: '8504', description: 'Electrical Transformers, Inverters', rate: 18, sector: 'ELECTRONICS' },

  { hsn: '3004', description: 'Medicaments Consisting of Mixed/Unmixed Products', rate: 12, sector: 'MEDICAL' },
  { hsn: '9018', description: 'Medical, Surgical, Dental Instruments', rate: 12, sector: 'MEDICAL' },
];

