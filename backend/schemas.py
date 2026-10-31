"""
schemas.py - Bharat GST Vision Engine / ParchiSetu AI
Strict Pydantic v2 schemas adhering to the Lane 1 & 4-Lane Shared Contract.
"""

from __future__ import annotations
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, model_validator


# ============================================================================
# 1. Raw Gemini Vision Extraction Models (Passed to Gemini response_schema)
# ============================================================================

class RawVisionLineItem(BaseModel):
    line_number: int = Field(..., description="1-based line sequence number on paper receipt")
    raw_text_on_paper: str = Field(..., description="Exact vernacular/Hinglish text as written on receipt")
    product_name_normalized: str = Field(..., description="Clean normalized English product name for HSN lookup")
    item_sector: str = Field(default="GENERAL", description="Sector: GROCERY, TEXTILE, ELECTRONICS, HARDWARE, MEDICAL, GENERAL")
    is_struck_out: bool = Field(default=False, description="True if scratched out or crossed with pen markings")
    raw_quantity: str = Field(..., description="Quantity as written, e.g. 'Dedh peti', '10 Gaz', '2.5 kg'")
    quantity: float = Field(..., description="Standardized float quantity, e.g. 1.5, 10.0, 2.5")
    unit_uqc: str = Field(default="PCS", description="GST UQC code: KGS, PCS, BOX, MTR, YD, BAG, STRP, LTR, DOZ, PAR")
    unit_price: Optional[float] = Field(None, description="Explicit rate per unit if written, else None")
    written_line_total: float = Field(..., description="Exact number written as line total by shopkeeper (DO NOT AUTO-CORRECT)")
    confidence_score: float = Field(default=0.90, ge=0.0, le=1.0, description="OCR confidence score between 0.0 and 1.0")


class RawVisionBill(BaseModel):
    detected_sector: Literal["GROCERY", "TEXTILE", "TEXTILES", "ELECTRONICS", "HARDWARE", "MEDICAL", "FOOTWEAR_AUTO", "GENERAL"] = Field(
        default="GENERAL",
        description="Overall detected business sector of the invoice"
    )
    merchant_name: Optional[str] = Field(None, description="Shop / Merchant name extracted from header")
    supplier_gstin: Optional[str] = Field(None, description="Supplier GSTIN printed or stamped on bill header")
    invoice_id: Optional[str] = Field(None, description="Bill/Invoice number printed or written on slip (e.g. 406)")
    store_address: Optional[str] = Field(None, description="Shop/merchant store address printed on header")
    raw_date_written: Optional[str] = Field(None, description="Date text as written on the receipt")
    customer_name: Optional[str] = Field(None, description="Customer / Buyer name written on bill")
    customer_phone: Optional[str] = Field(None, description="Customer phone / 10-digit mobile number written on bill")
    customer_address: Optional[str] = Field(None, description="Customer delivery address / colony / city written on bill")
    extra_charges: Optional[float] = Field(0.0, description="Freight, kiraya, cartage or loading charges added below subtotal")
    discount_amount: Optional[float] = Field(0.0, description="Cash discount deducted at end")
    written_grand_total: Optional[float] = Field(None, description="Grand total written on paper receipt if present")
    items: List[RawVisionLineItem] = Field(default_factory=list, description="Extracted line items")


# ============================================================================
# 2. Audited Frontend API Contract Models (Frozen 4-Lane Contract)
# ============================================================================

class HSNAlternative(BaseModel):
    hsn_code: str
    label: str
    gst_rate: float


class AuditedLineItem(BaseModel):
    row_id: int = Field(..., description="Unique row index")
    line_number: Optional[int] = None
    raw_text: str = Field(..., description="Original vernacular raw text")
    raw_text_on_paper: Optional[str] = None
    product_name_normalized: str = Field(..., description="Normalized English product name")
    quantity: float = Field(default=1.0)
    raw_unit: Optional[str] = Field(default="nag")
    standard_uqc: str = Field(default="PCS")
    unit_uqc: Optional[str] = None
    unit_price: float = Field(default=0.0)
    written_line_total: float = Field(default=0.0)
    audited_line_total: float = Field(default=0.0)
    has_math_error: bool = Field(default=False)
    math_discrepancy: float = Field(default=0.0)
    hsn_code: str = Field(default="9999")
    category_description: str = Field(default="General Goods")
    hsn_description: Optional[str] = None
    gst_rate: float = Field(default=18.0)
    cgst_rate: float = Field(default=9.0)
    sgst_rate: float = Field(default=9.0)
    igst_rate: float = Field(default=0.0)
    cgst_amount: float = Field(default=0.0)
    sgst_amount: float = Field(default=0.0)
    igst_amount: float = Field(default=0.0)
    total_with_tax: float = Field(default=0.0)
    final_line_total_with_gst: Optional[float] = None
    confidence: float = Field(default=0.90)
    confidence_score: Optional[float] = None
    tax_rule_note: Optional[str] = None
    cbic_schedule: Optional[str] = None
    statutory_chapter_note: Optional[str] = None
    rag_citation: Optional[Dict[str, Any]] = None
    top_3_alternatives: List[Dict[str, Any]] = Field(default_factory=list)
    hsn_alternatives: Optional[List[Dict[str, Any]]] = None

    @model_validator(mode="after")
    def sync_aliases(self) -> AuditedLineItem:
        if self.line_number is None:
            self.line_number = self.row_id
        if self.raw_text_on_paper is None:
            self.raw_text_on_paper = self.raw_text
        if self.unit_uqc is None:
            self.unit_uqc = self.standard_uqc
        if self.hsn_description is None:
            self.hsn_description = self.category_description
        if self.final_line_total_with_gst is None:
            self.final_line_total_with_gst = self.total_with_tax
        if self.confidence_score is None:
            self.confidence_score = self.confidence
        if self.hsn_alternatives is None:
            self.hsn_alternatives = self.top_3_alternatives
        if self.cgst_rate == 0.0 and self.sgst_rate == 0.0 and self.igst_rate == 0.0 and self.gst_rate > 0.0:
            half = round(self.gst_rate / 2.0, 2)
            self.cgst_rate = half
            self.sgst_rate = half
        return self


class StruckOutItem(BaseModel):
    row_id: Optional[int] = None
    raw_text: str
    written_line_total: float = 0.0
    reason: Optional[str] = "Crossed out or cut with pen markings"


class InvoiceSummary(BaseModel):
    written_grand_total: float = 0.0
    audited_taxable_total: float = 0.0
    total_math_saved: float = 0.0
    extra_charges: float = 0.0
    discount_amount: float = 0.0
    total_cgst: float = 0.0
    total_sgst: float = 0.0
    total_igst: float = 0.0
    final_payable_pakka_total: float = 0.0


class AuditedInvoiceResponse(BaseModel):
    bill_id: str = Field(..., description="SHA-256 hash or unique invoice identifier")
    invoice_id: Optional[str] = None
    detected_sector: str = Field(default="GENERAL")
    store_name_guess: Optional[str] = None
    merchant_name: Optional[str] = None
    store_address: Optional[str] = None
    supplier_gstin: Optional[str] = None
    supplier_state_code: str = Field(default="03")
    supplier_state_name: Optional[str] = "Punjab"
    buyer_gstin: Optional[str] = None
    buyer_state_code: Optional[str] = None
    buyer_state_name: Optional[str] = None
    place_of_supply_state_code: str = Field(default="03")
    place_of_supply_state_name: Optional[str] = "Punjab"
    is_inter_state: bool = Field(default=False)
    supply_type_b2b: str = Field(default="B2CS")
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    extra_charges: Optional[float] = 0.0
    discount_amount: Optional[float] = 0.0
    raw_date_written: Optional[str] = None
    normalized_date_iso: Optional[str] = None
    compliance_audit: Dict[str, Any] = Field(default_factory=dict)
    model_used: Optional[str] = "gemini-3.5-flash-lite"
    cache_hit: bool = False
    raw_image_b64: Optional[str] = None
    enhanced_image_b64: Optional[str] = None
    enhanced_image_base64: Optional[str] = None
    active_items: List[AuditedLineItem] = Field(default_factory=list)
    struck_out_items: List[StruckOutItem] = Field(default_factory=list)
    summary: InvoiceSummary = Field(default_factory=InvoiceSummary)

    @model_validator(mode="after")
    def sync_response_fields(self) -> AuditedInvoiceResponse:
        if self.invoice_id is None:
            self.invoice_id = self.bill_id
        if self.merchant_name is None:
            self.merchant_name = self.store_name_guess
        elif self.store_name_guess is None:
            self.store_name_guess = self.merchant_name
        if self.enhanced_image_base64 is None:
            self.enhanced_image_base64 = self.enhanced_image_b64
        elif self.enhanced_image_b64 is None:
            self.enhanced_image_b64 = self.enhanced_image_base64
        return self


# ============================================================================
# 3. Recalculate & Export Request Payloads
# ============================================================================

class RecalculateRequest(BaseModel):
    bill_id: Optional[str] = None
    invoice_id: Optional[str] = None
    detected_sector: Optional[str] = "GENERAL"
    store_name_guess: Optional[str] = None
    merchant_name: Optional[str] = None
    store_address: Optional[str] = None
    supplier_gstin: Optional[str] = None
    supplier_state_code: Optional[str] = "03"
    buyer_gstin: Optional[str] = None
    place_of_supply_state_code: Optional[str] = "03"
    is_inter_state: Optional[bool] = None
    invoice_date: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    extra_charges: Optional[float] = 0.0
    discount_amount: Optional[float] = 0.0
    raw_date_written: Optional[str] = None
    normalized_date_iso: Optional[str] = None
    raw_image_b64: Optional[str] = None
    enhanced_image_b64: Optional[str] = None
    active_items: List[Dict[str, Any]] = Field(default_factory=list)
    struck_out_items: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    summary: Optional[Dict[str, Any]] = None


class GSTR1ExportRequest(BaseModel):
    gstin: Optional[str] = "03AABCS1429B1Z"
    supplier_gstin: Optional[str] = None
    buyer_gstin: Optional[str] = None
    tax_period: Optional[str] = "102026"
    pos_code: Optional[str] = "03"
    invoice: Optional[AuditedInvoiceResponse] = None
    raw_payload: Optional[Dict[str, Any]] = None
