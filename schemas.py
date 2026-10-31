"""
schemas.py - Bharat GST Vision Engine / ParchiSetu AI
Strict Pydantic v2 schemas adhering to the Lane 1 & 4-Lane Shared Contract.
Guarantees ZERO null (None) values in any JSON serialization.
"""

from __future__ import annotations
from typing import List, Optional, Dict, Any, Literal, Union
from pydantic import BaseModel, Field, model_validator


# ============================================================================
# 1. Raw Gemini Vision Extraction Models (Passed to Gemini response_schema)
# ============================================================================

class RawVisionLineItem(BaseModel):
    line_number: int = Field(default=1, description="1-based line sequence number on paper receipt")
    raw_text_on_paper: str = Field(default="", description="Exact vernacular/Hinglish text as written on receipt")
    product_name_normalized: str = Field(default="", description="Clean normalized English product name for HSN lookup")
    item_sector: str = Field(default="GENERAL", description="Sector: GROCERY, TEXTILE, ELECTRONICS, HARDWARE, MEDICAL, GENERAL")
    is_struck_out: bool = Field(default=False, description="True if scratched out or crossed with pen markings")
    raw_quantity: str = Field(default="1", description="Quantity as written, e.g. 'Dedh peti', '10 Gaz', '2.5 kg'")
    quantity: float = Field(default=1.0, description="Standardized float quantity, e.g. 1.5, 10.0, 2.5")
    unit_uqc: str = Field(default="PCS", description="GST UQC code: KGS, PCS, BOX, MTR, YD, BAG, STRP, LTR, DOZ, PAR")
    unit_price: Optional[float] = Field(None, description="Explicit rate per unit if written, else None")
    written_line_total: float = Field(default=0.0, description="Exact number written as line total by shopkeeper (DO NOT AUTO-CORRECT)")
    confidence_score: float = Field(default=0.90, ge=0.0, le=1.0, description="OCR confidence score between 0.0 and 1.0")
    written_hsn_code: Optional[str] = Field(None, description="HSN/SAC code written on paper if present")
    suggested_hsn_4digit: Optional[str] = Field(None, description="4-digit HSN code suggested by vision model")
    suggested_gst_slab: Optional[float] = Field(None, description="Suggested GST rate slab: 0, 3, 5, 12, 18, 28")


class RawVisionBill(BaseModel):
    detected_sector: str = Field(
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
    written_subtotal: Optional[float] = Field(None, description="Subtotal amount written on paper before tax/freight if present")
    written_grand_total: Optional[float] = Field(None, description="Grand total written on paper receipt if present")
    items: List[RawVisionLineItem] = Field(default_factory=list, description="Extracted line items")


# ============================================================================
# 2. Audited Frontend API Contract Models (Frozen 4-Lane Contract)
# ============================================================================

class ValidationDoubt(BaseModel):
    doubt_id: str = Field(default="", description="Unique identifier for the doubt item")
    code: str = Field(default="", description="Machine-readable doubt code e.g. UNALLOCATED_LUMPSUM_TOTAL")
    field_type: str = Field(default="", description="Category of doubt or ambiguity for legacy compatibility")
    severity: Literal["BLOCKING", "WARNING"] = Field(default="WARNING", description="BLOCKING halts compliance; WARNING requires shopkeeper review")
    line_number: int = Field(default=0, description="Affected line number if row-specific")
    message: str = Field(default="", description="User-facing prompt or clarifying question")
    suggested_resolution: str = Field(default="", description="Recommended user action or automated fallback")
    detected_value: Union[str, float, int] = Field(default="", description="Detected string or conflicting value from paper")
    detected_amount: float = Field(default=0.0, description="Detected monetary amount associated with doubt")

    @model_validator(mode="before")
    @classmethod
    def sanitize_none(cls, data: Any) -> Any:
        if isinstance(data, dict):
            for k in ["doubt_id", "code", "field_type", "message", "suggested_resolution"]:
                if data.get(k) is None:
                    data[k] = ""
            if data.get("detected_value") is None:
                data["detected_value"] = ""
            if data.get("line_number") is None:
                data["line_number"] = 0
            if data.get("detected_amount") is None:
                data["detected_amount"] = 0.0
            if not data.get("code") and data.get("field_type"):
                data["code"] = str(data["field_type"])
            if not data.get("field_type") and data.get("code"):
                data["field_type"] = str(data["code"])
        return data


# Backward-compatible alias
DoubtItem = ValidationDoubt


class HSNAlternative(BaseModel):
    hsn_code: str = Field(default="")
    label: str = Field(default="")
    gst_rate: float = Field(default=0.0)


class ComplianceReport(BaseModel):
    is_compliant: bool = Field(default=False)
    financial_year: str = Field(default="")
    rule_46b_valid: bool = Field(default=False)
    rule_46b_notes: str = Field(default="")
    blocking_doubts_count: int = Field(default=0)
    warning_doubts_count: int = Field(default=0)
    statutory_notes: List[str] = Field(default_factory=list)
    gstin_validation: Dict[str, Any] = Field(default_factory=dict)


class AuditedLineItem(BaseModel):
    row_id: int = Field(default=1, description="Unique row index")
    line_number: int = Field(default=1)
    raw_text: str = Field(default="", description="Original vernacular raw text")
    raw_text_on_paper: str = Field(default="")
    product_name_normalized: str = Field(default="", description="Normalized English product name")
    quantity: float = Field(default=1.0)
    raw_unit: str = Field(default="nag")
    standard_uqc: str = Field(default="PCS")
    unit_uqc: str = Field(default="PCS")
    unit_price: float = Field(default=0.0)
    written_line_total: float = Field(default=0.0)
    audited_line_total: float = Field(default=0.0)
    has_math_error: bool = Field(default=False)
    math_discrepancy: float = Field(default=0.0)
    hsn_code: str = Field(default="9999")
    category_description: str = Field(default="General Goods")
    hsn_description: str = Field(default="General Goods")
    gst_rate: float = Field(default=18.0)
    cgst_rate: float = Field(default=9.0)
    sgst_rate: float = Field(default=9.0)
    igst_rate: float = Field(default=0.0)
    cgst_amount: float = Field(default=0.0)
    sgst_amount: float = Field(default=0.0)
    igst_amount: float = Field(default=0.0)
    total_with_tax: float = Field(default=0.0)
    final_line_total_with_gst: float = Field(default=0.0)
    confidence: float = Field(default=0.90)
    confidence_score: float = Field(default=0.90)
    hsn_match_confidence: float = Field(default=0.90)
    price_status: str = Field(default="EXTRACTED", description="EXTRACTED | DERIVED_FROM_LINE_TOTAL | DERIVED_LUMPSUM_ALLOCATION | MISSING_REQUIRES_INPUT | LOW_CONFIDENCE_DOUBT")
    tax_rule_note: str = Field(default="")
    ocr_self_healed_note: str = Field(default="")
    written_hsn_code: str = Field(default="")
    suggested_hsn_4digit: str = Field(default="")
    suggested_gst_slab: float = Field(default=0.0)
    cbic_schedule: str = Field(default="")
    statutory_chapter_note: str = Field(default="")
    rag_citation: Dict[str, Any] = Field(default_factory=dict)
    top_3_alternatives: List[Dict[str, Any]] = Field(default_factory=list)
    hsn_alternatives: List[Dict[str, Any]] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def sanitize_none(cls, data: Any) -> Any:
        if isinstance(data, dict):
            for k, v in list(data.items()):
                if v is None:
                    if k in [
                        "raw_text", "raw_text_on_paper", "product_name_normalized",
                        "raw_unit", "standard_uqc", "unit_uqc", "hsn_code",
                        "category_description", "hsn_description", "tax_rule_note",
                        "ocr_self_healed_note", "written_hsn_code", "suggested_hsn_4digit",
                        "cbic_schedule", "statutory_chapter_note", "price_status"
                    ]:
                        data[k] = ""
                    elif k in [
                        "quantity", "unit_price", "written_line_total", "audited_line_total",
                        "math_discrepancy", "gst_rate", "cgst_rate", "sgst_rate", "igst_rate",
                        "cgst_amount", "sgst_amount", "igst_amount", "total_with_tax",
                        "final_line_total_with_gst", "confidence", "confidence_score",
                        "hsn_match_confidence", "suggested_gst_slab"
                    ]:
                        data[k] = 0.0
                    elif k in ["row_id", "line_number"]:
                        data[k] = 1
                    elif k in ["has_math_error"]:
                        data[k] = False
                    elif k in ["top_3_alternatives", "hsn_alternatives"]:
                        data[k] = []
                    elif k in ["rag_citation"]:
                        data[k] = {}
        return data

    @model_validator(mode="after")
    def sync_aliases(self) -> AuditedLineItem:
        if not self.line_number:
            self.line_number = self.row_id or 1
        if not self.raw_text_on_paper:
            self.raw_text_on_paper = self.raw_text
        if not self.raw_text:
            self.raw_text = self.raw_text_on_paper
        if not self.unit_uqc:
            self.unit_uqc = self.standard_uqc or "PCS"
        if not self.hsn_description:
            self.hsn_description = self.category_description
        if self.final_line_total_with_gst == 0.0 and self.total_with_tax > 0.0:
            self.final_line_total_with_gst = self.total_with_tax
        if self.confidence_score == 0.0 and self.confidence > 0.0:
            self.confidence_score = self.confidence
        if not self.hsn_alternatives and self.top_3_alternatives:
            self.hsn_alternatives = self.top_3_alternatives
        elif not self.top_3_alternatives and self.hsn_alternatives:
            self.top_3_alternatives = self.hsn_alternatives
        if self.cgst_rate == 0.0 and self.sgst_rate == 0.0 and self.igst_rate == 0.0 and self.gst_rate > 0.0:
            half = round(self.gst_rate / 2.0, 2)
            self.cgst_rate = half
            self.sgst_rate = half
        return self


class StruckOutItem(BaseModel):
    row_id: int = Field(default=0)
    raw_text: str = Field(default="")
    written_line_total: float = Field(default=0.0)
    reason: str = Field(default="Crossed out or cut with pen markings")

    @model_validator(mode="before")
    @classmethod
    def sanitize_none(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if data.get("row_id") is None:
                data["row_id"] = 0
            if data.get("raw_text") is None:
                data["raw_text"] = ""
            if data.get("written_line_total") is None:
                data["written_line_total"] = 0.0
            if data.get("reason") is None:
                data["reason"] = "Crossed out or cut with pen markings"
        return data


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
    bill_id: str = Field(default="", description="SHA-256 hash or unique invoice identifier")
    invoice_id: str = Field(default="")
    bill_number: str = Field(default="")
    financial_year: str = Field(default="", description="Indian FY e.g. 2026-27")
    detected_sector: str = Field(default="GENERAL")
    store_name_guess: str = Field(default="")
    merchant_name: str = Field(default="")
    store_address: str = Field(default="")
    supplier_phone: str = Field(default="")
    supplier_gstin: str = Field(default="")
    extracted_supplier_gstin: str = Field(default="")
    supplier_state_code: str = Field(default="")
    supplier_state_name: str = Field(default="")
    buyer_gstin: str = Field(default="")
    buyer_state_code: str = Field(default="")
    buyer_state_name: str = Field(default="")
    place_of_supply_state_code: str = Field(default="")
    place_of_supply_state_name: str = Field(default="")
    is_inter_state: bool = Field(default=False)
    supply_type: str = Field(default="B2CS")
    supply_type_b2b: str = Field(default="B2CS")
    customer_name: str = Field(default="")
    customer_phone: str = Field(default="")
    customer_address: str = Field(default="")
    extra_charges: float = Field(default=0.0)
    discount_amount: float = Field(default=0.0)
    is_tax_inclusive: bool = Field(default=False, description="True if receipt prices are MRP inclusive of GST")
    raw_date_written: str = Field(default="")
    raw_date_text: str = Field(default="")
    normalized_date_iso: str = Field(default="")
    date_source: str = Field(default="")
    is_100_percent_compliant: bool = Field(default=False, description="True ONLY when zero BLOCKING doubts remain")
    field_statuses: Dict[str, str] = Field(default_factory=dict, description="EXTRACTED | DERIVED | MISSING_REQUIRES_INPUT | LOW_CONFIDENCE_DOUBT")
    pending_doubts: List[ValidationDoubt] = Field(default_factory=list, description="List of unresolved ambiguities or missing mandatory fields")
    compliance_report: ComplianceReport = Field(default_factory=ComplianceReport)
    compliance_audit: Dict[str, Any] = Field(default_factory=dict)
    model_used: str = Field(default="gemini-3.5-flash-lite")
    cache_hit: bool = Field(default=False)
    raw_image_b64: str = Field(default="")
    enhanced_image_b64: str = Field(default="")
    enhanced_image_base64: str = Field(default="")
    active_items: List[AuditedLineItem] = Field(default_factory=list)
    items: List[AuditedLineItem] = Field(default_factory=list)
    struck_out_items: List[StruckOutItem] = Field(default_factory=list)
    summary: InvoiceSummary = Field(default_factory=InvoiceSummary)

    @model_validator(mode="before")
    @classmethod
    def sanitize_none(cls, data: Any) -> Any:
        if isinstance(data, dict):
            for k, v in list(data.items()):
                if v is None:
                    if k in [
                        "bill_id", "invoice_id", "bill_number", "financial_year",
                        "detected_sector", "store_name_guess", "merchant_name",
                        "store_address", "supplier_phone", "supplier_gstin",
                        "extracted_supplier_gstin", "supplier_state_code",
                        "supplier_state_name", "buyer_gstin", "buyer_state_code",
                        "buyer_state_name", "place_of_supply_state_code",
                        "place_of_supply_state_name", "supply_type", "supply_type_b2b",
                        "customer_name", "customer_phone", "customer_address",
                        "raw_date_written", "raw_date_text", "normalized_date_iso",
                        "date_source", "model_used", "raw_image_b64",
                        "enhanced_image_b64", "enhanced_image_base64"
                    ]:
                        data[k] = ""
                    elif k in ["extra_charges", "discount_amount"]:
                        data[k] = 0.0
                    elif k in ["is_inter_state", "is_tax_inclusive", "is_100_percent_compliant", "cache_hit"]:
                        data[k] = False
                    elif k in ["active_items", "items", "struck_out_items", "pending_doubts"]:
                        data[k] = []
                    elif k in ["field_statuses", "compliance_audit"]:
                        data[k] = {}
        return data

    @model_validator(mode="after")
    def sync_response_fields(self) -> AuditedInvoiceResponse:
        if not self.invoice_id and self.bill_id:
            if len(self.bill_id) > 16:
                self.invoice_id = f"INV-{self.bill_id[:8].upper()}"
            else:
                self.invoice_id = self.bill_id.replace("_", "-")[:16]
        elif self.invoice_id:
            cleaned = self.invoice_id.replace("_", "-").replace(" ", "-")
            if len(cleaned) >= 32 and all(c in "0123456789abcdefABCDEF" for c in cleaned):
                self.invoice_id = f"INV-{cleaned[:8].upper()}"
            else:
                self.invoice_id = cleaned[:16]

        if not self.bill_number and self.invoice_id:
            self.bill_number = self.invoice_id
        elif self.bill_number:
            self.bill_number = self.bill_number.replace("_", "-")[:16]
        if not self.items and self.active_items:
            self.items = self.active_items
        elif not self.active_items and self.items:
            self.active_items = self.items
        if not self.merchant_name and self.store_name_guess:
            self.merchant_name = self.store_name_guess
        elif not self.store_name_guess and self.merchant_name:
            self.store_name_guess = self.merchant_name
        if not self.extracted_supplier_gstin and self.supplier_gstin:
            self.extracted_supplier_gstin = self.supplier_gstin
        elif not self.supplier_gstin and self.extracted_supplier_gstin:
            self.supplier_gstin = self.extracted_supplier_gstin
        if not self.raw_date_text and self.raw_date_written:
            self.raw_date_text = self.raw_date_written
        elif not self.raw_date_written and self.raw_date_text:
            self.raw_date_written = self.raw_date_text
        if not self.enhanced_image_base64 and self.enhanced_image_b64:
            self.enhanced_image_base64 = self.enhanced_image_b64
        elif not self.enhanced_image_b64 and self.enhanced_image_base64:
            self.enhanced_image_b64 = self.enhanced_image_base64
        return self


# ============================================================================
# 3. Recalculate & Export Request Payloads
# ============================================================================

class RecalculateRequest(BaseModel):
    bill_id: Optional[str] = ""
    invoice_id: Optional[str] = ""
    financial_year: Optional[str] = ""
    detected_sector: Optional[str] = "GENERAL"
    store_name_guess: Optional[str] = ""
    merchant_name: Optional[str] = ""
    store_address: Optional[str] = ""
    supplier_phone: Optional[str] = ""
    supplier_gstin: Optional[str] = ""
    supplier_state_code: Optional[str] = ""
    buyer_gstin: Optional[str] = ""
    place_of_supply_state_code: Optional[str] = ""
    is_inter_state: Optional[bool] = None
    is_tax_inclusive: Optional[bool] = False
    apply_lumpsum_allocation: Optional[bool] = False
    customer_name: Optional[str] = ""
    customer_phone: Optional[str] = ""
    customer_address: Optional[str] = ""
    extra_charges: Optional[float] = 0.0
    discount_amount: Optional[float] = 0.0
    raw_date_written: Optional[str] = ""
    normalized_date_iso: Optional[str] = ""
    raw_image_b64: Optional[str] = ""
    enhanced_image_b64: Optional[str] = ""
    active_items: List[Dict[str, Any]] = Field(default_factory=list)
    items: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    struck_out_items: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    summary: Optional[Dict[str, Any]] = None


class RegisterNumberRequest(BaseModel):
    supplier_gstin: str = Field(default="")
    financial_year: str = Field(default="")
    invoice_id: str = Field(default="")
    normalized_date_iso: str = Field(default="")


class GSTR1ExportRequest(BaseModel):
    gstin: str = Field(default="")
    supplier_gstin: str = Field(default="")
    buyer_gstin: str = Field(default="")
    tax_period: str = Field(default="")
    pos_code: str = Field(default="")
    invoice: Optional[AuditedInvoiceResponse] = None
    raw_payload: Optional[Dict[str, Any]] = None
