/**
 * Official Indian State & Union Territory GST State Codes (01 to 38 + 97).
 * Used for Place of Supply selection and Inter-State / Intra-State classification.
 */
export const INDIAN_STATES = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh (Old)' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
];

export const STATE_OPTIONS = INDIAN_STATES.map((s) => ({
  value: s.code,
  label: `${s.code} - ${s.name}`,
  subtitle: `GST State Code ${s.code}`,
}));

export const UQC_OPTIONS = [
  { value: 'PCS', label: 'PCS - Pieces' },
  { value: 'BAG', label: 'BAG - Bags' },
  { value: 'BOX', label: 'BOX - Boxes' },
  { value: 'KGS', label: 'KGS - Kilograms' },
  { value: 'MTR', label: 'MTR - Metres' },
  { value: 'LTR', label: 'LTR - Litres' },
  { value: 'SET', label: 'SET - Sets' },
  { value: 'NOS', label: 'NOS - Numbers' },
  { value: 'CAN', label: 'CAN - Cans' },
  { value: 'ROL', label: 'ROL - Rolls' },
  { value: 'BTL', label: 'BTL - Bottles' },
  { value: 'OTH', label: 'OTH - Others' },
];

export const GST_SLAB_OPTIONS = [
  { value: 0, label: '0% (Exempt)' },
  { value: 3, label: '3% (Precious Metals)' },
  { value: 5, label: '5% (Essential Goods)' },
  { value: 12, label: '12% (Standard Low)' },
  { value: 18, label: '18% (Standard High)' },
  { value: 28, label: '28% (Luxury / De-merit)' },
];
