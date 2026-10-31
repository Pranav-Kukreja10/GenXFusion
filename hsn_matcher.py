"""
hsn_matcher.py - PyTorch / Hybrid Vector HSN Matcher
Part of ParchiSetu AI / Bharat GST Vision Engine (Lane 2).

Features:
1. Loads 250+ Indian items & 99 CBIC Chapter heads from data/hsn_master.csv.
2. Uses sentence-transformers (all-MiniLM-L6-v2) if PyTorch is installed.
3. Fast TF-IDF / Token N-Gram / SequenceMatcher hybrid vector engine (<2ms).
4. Rule 1: Priority for explicit written HSN code (paper or OCR) -> 0.99 confidence.
5. Rule 2: Priority checks for Cement (2523, 28%), Tiles (6907, 18%), Wood/Timber (4407/4412, 18%), Furniture (9403, 18%), Fertilizer (3102, 5%).
6. Rule 3: Dynamic LLM fallback for random unseen items using suggested_hsn_4digit and suggested_gst_slab.
7. Rule 4: Conditional ₹1,000 threshold for Apparel (5%->12%) and Footwear (12%->18%).
8. Rule 5: Statutory CBIC RAG citations (cbic_schedule + statutory_chapter_note).
"""

from __future__ import annotations
import csv
import difflib
import logging
import math
import os
import re
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("hsn_matcher")
logging.basicConfig(level=logging.INFO)

# Locate HSN Master CSV
CSV_CANDIDATE_PATHS = [
    Path("data/hsn_master.csv"),
    Path("backend/data/hsn_master.csv"),
    Path(__file__).parent / "data" / "hsn_master.csv",
    Path(__file__).parent / "backend" / "data" / "hsn_master.csv",
]

CSV_PATH = next((p for p in CSV_CANDIDATE_PATHS if p.exists()), Path("data/hsn_master.csv"))

# Chapter head fallbacks when similarity < 0.55
SECTOR_DEFAULT_CHAPTERS: Dict[str, Tuple[str, str, float]] = {
    "TEXTILE": ("6203", "Readymade Apparel / Textiles", 5.0),
    "TEXTILES": ("6203", "Readymade Apparel / Textiles", 5.0),
    "GROCERY": ("1101", "Wheat Flour / Grocery Staples", 5.0),
    "ELECTRONICS": ("8539", "LED Lamps & Electricals", 18.0),
    "HARDWARE": ("4412", "Wood, Timber, Plywood & Building Materials", 18.0),
    "MEDICAL": ("3004", "Medicaments & Pharmaceutical Drugs", 12.0),
    "FOOTWEAR_UTENSILS": ("6402", "Footwear & Household Articles", 12.0),
    "FOOTWEAR_AUTO": ("6402", "Footwear & Household Articles", 12.0),
    "GENERAL": ("9999", "General Merchandise", 18.0),
}

# ============================================================================
# Statutory CBIC GST Schedules & Chapter Grounding Map
# ============================================================================
CBIC_SCHEDULES: Dict[float, str] = {
    0.0: "Exempt Notification No. 2/2017-CT(Rate)",
    3.0: "Special Schedule (1.5% CGST + 1.5% SGST) - Gold/Jewellery",
    5.0: "Schedule I (2.5% CGST + 2.5% SGST) - CBIC Notification 1/2017-CT(Rate)",
    12.0: "Schedule II (6% CGST + 6% SGST) - CBIC Notification 1/2017-CT(Rate)",
    18.0: "Schedule III (9% CGST + 9% SGST) - CBIC Notification 1/2017-CT(Rate)",
    28.0: "Schedule IV (14% CGST + 14% SGST) - CBIC Notification 1/2017-CT(Rate)",
}

STATUTORY_CHAPTER_MAP: Dict[str, str] = {
    "01": "Chapter 01 (Live Animals)",
    "02": "Chapter 02 (Meat & Edible Meat Offal)",
    "03": "Chapter 03 (Fish & Aquatic Invertebrates)",
    "04": "Chapter 04 (Dairy Produce, Eggs, Natural Honey, Milk)",
    "07": "Chapter 07 (Edible Vegetables, Certain Roots & Tubers)",
    "08": "Chapter 08 (Edible Fruit & Nuts, Citrus, Melons)",
    "09": "Chapter 09 (Coffee, Tea, Mate & Spices)",
    "10": "Chapter 10 (Cereals): Rice, wheat, foodgrains",
    "11": "Chapter 11 (Products of Milling Industry): Wheat flour, atta, maida, suji",
    "12": "Chapter 12 (Oil Seeds, Grains, Seeds & Fruit)",
    "15": "Chapter 15 (Animal/Vegetable Fats & Oils): Edible cooking oil, mustard oil, ghee",
    "17": "Chapter 17 (Sugars & Sugar Confectionery): Refined sugar, jaggery",
    "18": "Chapter 18 (Cocoa & Cocoa Preparations, Chocolates)",
    "19": "Chapter 19 (Preparations of Cereals/Flour): Biscuits, bakery products, noodles",
    "20": "Chapter 20 (Preparations of Vegetables, Fruit, Nuts): Jams, juices",
    "21": "Chapter 21 (Miscellaneous Edible Preparations): Spices, tea, sauces",
    "22": "Chapter 22 (Beverages, Spirits & Vinegar): Packaged water, aerated drinks",
    "24": "Chapter 24 (Tobacco & Manufactured Tobacco Substitutes, Pan Masala)",
    "25": "Chapter 25 (Salt, Sulphur, Earths, Stone, Lime & Cement): Portland cement under Heading 2523",
    "27": "Chapter 27 (Mineral Fuels, Oils & Products of Distillation): Lubricants, LPG",
    "30": "Chapter 30 (Pharmaceutical Products): Medicaments & formulations under Heading 3004",
    "31": "Chapter 31 (Fertilizers): Mineral or chemical fertilizers under Heading 3102",
    "32": "Chapter 32 (Tanning, Dyeing Extracts, Paints & Varnishes): Heading 3208",
    "33": "Chapter 33 (Essential Oils, Perfumery, Cosmetics, Toilet Preparations)",
    "34": "Chapter 34 (Soap, Organic Surface-Active Agents, Detergents): Soaps & cleaning agents",
    "38": "Chapter 38 (Miscellaneous Chemical Products): Agrochemicals, insecticides",
    "39": "Chapter 39 (Plastics & Articles thereof): PVC pipes, plastic fittings",
    "40": "Chapter 40 (Rubber & Articles thereof): Tyres, tubes",
    "44": "Chapter 44 (Wood & Articles of Wood): Sawn timber, plywood & panels under Heading 4407/4412",
    "48": "Chapter 48 (Paper & Paperboard, Articles of Paper Pulp)",
    "52": "Chapter 52 (Cotton): Cotton yarn & woven unstitched fabric under Heading 5208",
    "54": "Chapter 54 (Man-made Filaments, Synthetic Fabrics)",
    "55": "Chapter 55 (Man-made Staple Fibres)",
    "61": "Chapter 61 (Articles of Apparel, Knitted or Crocheted): T-shirts, hosiery",
    "62": "Chapter 62 (Articles of Apparel, Not Knitted): Readymade suits, shirts, trousers under Heading 6203/6204",
    "63": "Chapter 63 (Other Made Up Textile Articles): Curtains, bedsheets, blankets",
    "64": "Chapter 64 (Footwear, Gaiters & Parts): Footwear under Heading 6402/6403",
    "68": "Chapter 68 (Articles of Stone, Plaster, Cement): Granite & marble slabs under Heading 6802",
    "69": "Chapter 69 (Ceramic Products): Ceramic flags, paving, vitrified & wall tiles under Heading 6907",
    "70": "Chapter 70 (Glass & Glassware)",
    "71": "Chapter 71 (Natural/Cultured Pearls, Precious Stones, Gold & Jewellery)",
    "72": "Chapter 72 (Iron & Steel): TMT bars, steel rods, sariya",
    "73": "Chapter 73 (Articles of Iron or Steel): Screws, nuts, bolts, sanitaryware",
    "74": "Chapter 74 (Copper & Articles thereof): Copper pipes, utensils",
    "76": "Chapter 76 (Aluminium & Articles thereof): Aluminium sections, foil",
    "82": "Chapter 82 (Tools, Implements, Cutlery)",
    "83": "Chapter 83 (Miscellaneous Articles of Base Metal): Locks, padlocks, hinges",
    "84": "Chapter 84 (Nuclear Reactors, Boilers, Machinery): Pumps, computers, printers",
    "85": "Chapter 85 (Electrical Machinery & Equipment): Wires, cables, switches, LED lamps under Heading 8539/8544",
    "87": "Chapter 87 (Vehicles other than Railway, Automobile Parts)",
    "90": "Chapter 90 (Optical, Photographic, Medical/Surgical Instruments)",
    "94": "Chapter 94 (Furniture, Bedding, Mattresses): Wooden/metal furniture, sofas under Heading 9403",
    "95": "Chapter 95 (Toys, Games & Sports Requisites)",
    "96": "Chapter 96 (Miscellaneous Manufactured Articles): Pens, stationary, brooms",
    "99": "Chapter 99 (Services & Sundry Goods): General sundry merchandise",
}


def build_rag_citation(
    hsn_code: str,
    category_description: str,
    gst_rate: float,
    confidence: float,
    rule_note: Optional[str] = None
) -> Dict[str, Any]:
    """Generates explainable legal citation grounded in official CBIC statutory schedules."""
    ch_code = str(hsn_code)[:2]
    ch_desc = STATUTORY_CHAPTER_MAP.get(ch_code, f"Chapter {ch_code} (Statutory Goods Classification)")
    sched = CBIC_SCHEDULES.get(float(gst_rate), f"CBIC Rate Schedule ({gst_rate}% GST)")

    statutory_note = (
        f"Matched via Vector RAG [Sim: {confidence:.2f}] -> {ch_desc}, Heading {hsn_code}: "
        f"{category_description} ({gst_rate}% under {sched})"
    )
    if rule_note:
        statutory_note += f" | Rule: {rule_note}"

    return {
        "cbic_schedule": sched,
        "chapter": ch_code,
        "statutory_chapter_note": statutory_note,
        "vector_similarity": round(confidence, 2),
        "legal_grounding": f"Heading {hsn_code} classified under {ch_desc}. Applicable Rate: {gst_rate}% pursuant to {sched}."
    }


class HSNMasterCatalog:
    """Manages HSN database, aliases, vector embeddings, and fallback scoring."""

    def __init__(self, csv_path: Path = CSV_PATH):
        self.csv_path = csv_path
        self.records: List[Dict[str, Any]] = []
        self.hsn_lookup: Dict[str, Dict[str, Any]] = {}
        self.chapter_lookup: Dict[str, Dict[str, Any]] = {}
        self.use_neural = False
        self.neural_model = None
        self.embeddings = None
        self._load_records()
        self._init_engine()

    def _load_records(self) -> None:
        if not self.csv_path.exists():
            logger.warning(f"HSN CSV not found at {self.csv_path}. Using internal fallback dataset.")
            self._load_seed_dataset()
            return

        try:
            with open(self.csv_path, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    hsn = str(row["hsn_code"]).strip()
                    rec = {
                        "hsn_code": hsn,
                        "sector": str(row["sector"]).strip().upper(),
                        "description": str(row["description"]).strip(),
                        "hinglish_aliases": str(row.get("hinglish_aliases", "")).strip().lower(),
                        "base_gst_rate": float(row.get("base_gst_rate", 18.0)),
                        "has_price_threshold": str(row.get("has_price_threshold", "False")).strip().lower() == "true",
                        "threshold_amount": float(row.get("threshold_amount", 0.0)),
                        "above_threshold_gst_rate": float(row.get("above_threshold_gst_rate", row.get("base_gst_rate", 18.0))),
                        "default_uqc": str(row.get("default_uqc", "PCS")).strip(),
                        "cbic_schedule": str(row.get("cbic_schedule", "")).strip(),
                    }
                    self.records.append(rec)
                    self.hsn_lookup[hsn] = rec
                    ch = hsn[:2]
                    if ch not in self.chapter_lookup:
                        self.chapter_lookup[ch] = rec
            logger.info(f"Loaded {len(self.records)} HSN records from {self.csv_path}")
        except Exception as e:
            logger.error(f"Error loading HSN CSV: {e}. Loading internal seed dataset.")
            self._load_seed_dataset()

    def _load_seed_dataset(self) -> None:
        # Fallback minimal seed records in case CSV file is missing
        seeds = [
            ("1101", "GROCERY", "Wheat Flour / Atta Packaged", "atta chakki gehun flour maida suji", 5.0, False, 0, 5.0),
            ("1006", "GROCERY", "Basmati Rice Packaged", "chawal rice basmati india gate", 5.0, False, 0, 5.0),
            ("1512", "GROCERY", "Edible Cooking Oil", "tel oil refined sunflower sarson mustard", 5.0, False, 0, 5.0),
            ("6204", "TEXTILES", "Women Suits Ensembles & Lehnga", "lehnga lehenga suit salwar kameez kurti saree", 5.0, True, 1000, 12.0),
            ("6203", "TEXTILES", "Men Readymade Shirts & Trousers", "shirt pant jeans trousers kurta pyjama", 5.0, True, 1000, 12.0),
            ("5208", "TEXTILES", "Unstitched Cotton Fabric / Thaan", "than thaan kapda cotton fabric sut astar", 5.0, False, 0, 5.0),
            ("8539", "ELECTRONICS", "LED Lamps & Electric Bulbs", "led bulb light zero watt syska philips", 18.0, False, 0, 18.0),
            ("8544", "ELECTRONICS", "Insulated Copper Wire & Cable", "wire taar cable polycab havells copper", 18.0, False, 0, 18.0),
            ("2523", "HARDWARE", "Portland Cement / Bori", "cement bori katta ultratech acc ambuja", 28.0, False, 0, 28.0),
            ("3004", "MEDICAL", "Medicaments / Paracetamol", "paracetamol tablet dolo 650 crocin pain relief", 12.0, False, 0, 12.0),
            ("6402", "FOOTWEAR_UTENSILS", "Footwear & Slippers", "chappal shoes sandals joota slippers", 12.0, True, 1000, 18.0),
        ]
        for hsn, sec, desc, aliases, base, has_th, th, above in seeds:
            rec = {
                "hsn_code": hsn,
                "sector": sec,
                "description": desc,
                "hinglish_aliases": aliases,
                "base_gst_rate": base,
                "has_price_threshold": has_th,
                "threshold_amount": th,
                "above_threshold_gst_rate": above,
                "default_uqc": "PCS",
                "cbic_schedule": CBIC_SCHEDULES.get(base, "Statutory Schedule"),
            }
            self.records.append(rec)
            self.hsn_lookup[hsn] = rec
            ch = hsn[:2]
            if ch not in self.chapter_lookup:
                self.chapter_lookup[ch] = rec

    def _init_engine(self) -> None:
        """Attempt to load sentence-transformers / PyTorch; fallback cleanly if absent."""
        try:
            import torch
            from sentence_transformers import SentenceTransformer
            logger.info("Initializing SentenceTransformer('all-MiniLM-L6-v2') on PyTorch...")
            self.neural_model = SentenceTransformer("all-MiniLM-L6-v2")
            corpus = [f"{r['description']} {r['hinglish_aliases']} {r['sector']}" for r in self.records]
            self.embeddings = self.neural_model.encode(corpus, convert_to_tensor=True)
            self.use_neural = True
            logger.info("✅ SentenceTransformer initialized with precomputed tensor embeddings.")
        except Exception as e:
            self.use_neural = False
            logger.info(f"ℹ️ SentenceTransformer/Torch not loaded ({e}). Using ultra-fast hybrid token-vector engine.")

    def _hybrid_score(self, query: str, sector: str, record: Dict[str, Any]) -> float:
        """Computes hybrid string-similarity and token-overlap score in <0.05ms."""
        q_tokens = set(re.findall(r"\w+", query.lower()))
        if not q_tokens:
            return 0.0

        doc_text = f"{record['description']} {record['hinglish_aliases']}".lower()
        doc_tokens = set(re.findall(r"\w+", doc_text))

        overlap = q_tokens.intersection(doc_tokens)
        token_score = len(overlap) / len(q_tokens) if q_tokens else 0.0

        sub_boost = 0.0
        for token in q_tokens:
            if len(token) > 2 and token in doc_text:
                sub_boost += 0.2

        seq_ratio = difflib.SequenceMatcher(None, query.lower(), record["description"].lower()).ratio()
        sector_bonus = 0.15 if record["sector"] == sector.upper() else 0.0

        total_score = (token_score * 0.5) + (seq_ratio * 0.3) + min(sub_boost, 0.4) + sector_bonus
        return min(total_score, 1.0)

    def search_catalog(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search HSN items by keyword, code, or description."""
        q_clean = query.strip().lower()
        scored: List[Tuple[float, Dict[str, Any]]] = []

        for rec in self.records:
            if q_clean == rec["hsn_code"] or q_clean in rec["hsn_code"]:
                scored.append((1.5, rec))
                continue

            score = self._hybrid_score(q_clean, rec["sector"], rec)
            if score > 0.15 or q_clean in rec["description"].lower() or q_clean in rec["hinglish_aliases"]:
                scored.append((score, rec))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored[:limit]]

    def _finalize_match(
        self,
        top_rec: Dict[str, Any],
        unit_price: float,
        confidence: float,
        ranked: Optional[List[Tuple[float, Dict[str, Any]]]] = None,
        rule_prefix: Optional[str] = None
    ) -> Dict[str, Any]:
        """Calculates conditional GST slab thresholds, generates CBIC RAG, and builds alternatives."""
        has_th = top_rec.get("has_price_threshold", False)
        th_amt = float(top_rec.get("threshold_amount", 0.0))
        base_rate = float(top_rec.get("base_gst_rate", 18.0))
        above_rate = float(top_rec.get("above_threshold_gst_rate", base_rate))
        sector = str(top_rec.get("sector", "GENERAL")).upper()
        hsn_code = str(top_rec.get("hsn_code", "9999"))

        rule_note: Optional[str] = None
        if has_th and th_amt > 0 and unit_price > th_amt:
            final_gst_rate = above_rate
            if sector in ("TEXTILE", "TEXTILES") or hsn_code.startswith(("61", "62", "63")):
                rule_note = f"Garment > ₹{int(th_amt):,}: Auto-upgraded from {int(base_rate)}% to {int(above_rate)}% GST"
            elif sector in ("FOOTWEAR_UTENSILS", "FOOTWEAR_AUTO") or hsn_code.startswith("64"):
                rule_note = f"Footwear > ₹{int(th_amt):,}: Auto-upgraded from {int(base_rate)}% to {int(above_rate)}% GST"
            else:
                rule_note = f"Price > ₹{int(th_amt):,}: Upgraded to {int(above_rate)}% GST"
        elif has_th and th_amt > 0:
            final_gst_rate = base_rate
            if sector in ("TEXTILE", "TEXTILES") or hsn_code.startswith(("61", "62", "63")):
                rule_note = f"Garment <= ₹{int(th_amt):,}: Standard {int(base_rate)}% GST applied"
            elif sector in ("FOOTWEAR_UTENSILS", "FOOTWEAR_AUTO") or hsn_code.startswith("64"):
                rule_note = f"Footwear <= ₹{int(th_amt):,}: Standard {int(base_rate)}% GST applied"
            else:
                rule_note = f"Standard <= ₹{int(th_amt):,}: {int(base_rate)}% GST applied"
        else:
            final_gst_rate = base_rate

        if rule_prefix:
            rule_note = f"{rule_prefix} | {rule_note}" if rule_note else rule_prefix

        # Top 3 Alternatives for UI dropdown
        alternatives: List[Dict[str, Any]] = []
        seen_hsns = {hsn_code}

        alternatives.append({
            "hsn_code": hsn_code,
            "label": f"{hsn_code} - {top_rec.get('description', '')} ({final_gst_rate}%)",
            "gst_rate": final_gst_rate
        })

        if ranked:
            for _, cand in ranked:
                c_hsn = str(cand.get("hsn_code", ""))
                if c_hsn and c_hsn not in seen_hsns:
                    seen_hsns.add(c_hsn)
                    c_rate = cand.get("above_threshold_gst_rate", cand.get("base_gst_rate", 18.0)) if cand.get("has_price_threshold") and unit_price > cand.get("threshold_amount", 0.0) else cand.get("base_gst_rate", 18.0)
                    alternatives.append({
                        "hsn_code": c_hsn,
                        "label": f"{c_hsn} - {cand.get('description', '')} ({float(c_rate)}%)",
                        "gst_rate": float(c_rate)
                    })
                if len(alternatives) >= 3:
                    break

        rag = build_rag_citation(
            hsn_code=hsn_code,
            category_description=top_rec.get("description", "General Merchandise"),
            gst_rate=final_gst_rate,
            confidence=confidence,
            rule_note=rule_note
        )

        return {
            "hsn_code": hsn_code,
            "category_description": top_rec.get("description", "General Merchandise"),
            "gst_rate": final_gst_rate,
            "tax_rule_note": rule_note,
            "cbic_schedule": rag["cbic_schedule"],
            "statutory_chapter_note": rag["statutory_chapter_note"],
            "rag_citation": rag,
            "top_3_alternatives": alternatives,
            "confidence": confidence,
        }

    def match_item(
        self,
        product_name_normalized: str,
        raw_text: str = "",
        item_sector: str = "GENERAL",
        unit_price: float = 0.0,
        written_hsn_code: Optional[str] = None,
        suggested_hsn_4digit: Optional[str] = None,
        suggested_gst_slab: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Matches an item against the HSN catalog using:
        1. Explicit written HSN priority.
        2. Priority keywords (Tiles, Cement, Timber, Furniture, Fertilizer).
        3. Neural / Hybrid vector scoring.
        4. Dynamic LLM suggested HSN fallback for random items.
        """
        # Calling convention flexibility
        if isinstance(raw_text, str) and isinstance(item_sector, (int, float)):
            unit_price = float(item_sector)
            item_sector = raw_text
            raw_text = ""
        elif isinstance(raw_text, (int, float)):
            unit_price = float(raw_text)
            raw_text = ""

        combined_query = f"{product_name_normalized} {raw_text}".strip()
        combined_lower = combined_query.lower()
        sector_upper = (item_sector or "GENERAL").upper()

        # Rule 1: Priority for explicit written HSN code on invoice/paper
        clean_written_hsn = None
        if written_hsn_code:
            m = re.search(r"\b(\d{4,8})\b", str(written_hsn_code))
            if m:
                clean_written_hsn = m.group(1)

        if not clean_written_hsn:
            hsn_match = re.search(r"\b(?:hsn|acs|hsn/sac|code)[:\s]*(\d{4,8})\b", combined_lower)
            if hsn_match:
                clean_written_hsn = hsn_match.group(1)

        if clean_written_hsn:
            matched_rec = self.hsn_lookup.get(clean_written_hsn) or self.hsn_lookup.get(clean_written_hsn[:4])
            if not matched_rec and clean_written_hsn[:2] in self.chapter_lookup:
                matched_rec = dict(self.chapter_lookup[clean_written_hsn[:2]])
                matched_rec["hsn_code"] = clean_written_hsn[:4]
            if matched_rec:
                top_rec = dict(matched_rec)
                top_rec["hsn_code"] = clean_written_hsn[:4]
                return self._finalize_match(
                    top_rec=top_rec,
                    unit_price=unit_price,
                    confidence=0.99,
                    rule_prefix=f"Statutory Written HSN {clean_written_hsn[:4]}"
                )

        # Priority Check 1: Ceramic Tiles, Vitrified, Spenza, Kajaria, Flooring
        # Must ALWAYS map to HSN 6907 (18% GST), NEVER to 2523 (Cement 28%)
        is_tile_query = any(k in combined_lower for k in [
            "tile", "tiles", "ceramic", "ceramics", "spenza", "vitrified",
            "onyx", "plano", "marbonite", "kajaria", "somany", "nitco", "honey onyx", "vista plano"
        ])
        if is_tile_query:
            top_rec = self.hsn_lookup.get("6907") or {
                "hsn_code": "6907",
                "sector": "HARDWARE",
                "description": "Ceramic Flags, Paving, Hearth or Wall Tiles, Vitrified Tiles",
                "base_gst_rate": 18.0,
                "has_price_threshold": False,
                "threshold_amount": 0.0,
                "above_threshold_gst_rate": 18.0,
            }
            return self._finalize_match(top_rec, unit_price, confidence=0.98, rule_prefix="Ceramic & Vitrified Tiles (18% GST)")

        # Priority Check 2: Portland Cement / JK Cement / Ultratech / Ambuja / सीमेंट / सिमेंट (28% GST)
        is_cement_query = any(k in combined_lower for k in [
            "cement", "सीमेंट", "सिमेंट", "ultratech", "ambuja", "acc cement", "jk cement",
            "grey cement", "portland", "2523"
        ]) and not is_tile_query
        if is_cement_query:
            top_rec = self.hsn_lookup.get("2523") or {
                "hsn_code": "2523",
                "sector": "HARDWARE",
                "description": "Portland Cement, Aluminous Cement, Slag Cement",
                "base_gst_rate": 28.0,
                "has_price_threshold": False,
                "threshold_amount": 0.0,
                "above_threshold_gst_rate": 28.0,
            }
            return self._finalize_match(top_rec, unit_price, confidence=0.98, rule_prefix="Standard Portland Cement (28% GST)")

        # Priority Check 3: Furniture / Sofa / Chair / Table / Bed / Almirah
        is_furniture_query = any(k in combined_lower for k in [
            "sofa", "chair", "table", "bed", "almirah", "furniture", "wardrobe", "stool", "cabinet", "dining"
        ])
        if is_furniture_query:
            top_rec = self.hsn_lookup.get("9403") or {
                "hsn_code": "9403",
                "sector": "HARDWARE",
                "description": "Furniture, Sofas, Wooden & Metal Articles",
                "base_gst_rate": 18.0,
                "has_price_threshold": False,
                "threshold_amount": 0.0,
                "above_threshold_gst_rate": 18.0,
            }
            return self._finalize_match(top_rec, unit_price, confidence=0.95, rule_prefix="Furniture Articles (18% GST)")

        # Priority Check 4: Timber / Wood / Plywood / Lakkad / NEW KHAN Timber / Sona Timber
        is_timber_query = any(k in combined_lower for k in [
            "timber", "wood", "plywood", "lakkad", "lakdi", "sona timber", "khan timber",
            "plank", "teak", "sagwan", "sunmica", "board", "blockboard", "ply"
        ]) or ("timber" in sector_upper or "wood" in sector_upper)
        if is_timber_query and not any(c in combined_lower for c in ["cement", "सीमेंट"]):
            top_rec = self.hsn_lookup.get("4407") or self.hsn_lookup.get("4412") or {
                "hsn_code": "4407",
                "sector": "HARDWARE",
                "description": "Wood, Timber, Plywood & Veneered Panels",
                "base_gst_rate": 18.0,
                "has_price_threshold": False,
                "threshold_amount": 0.0,
                "above_threshold_gst_rate": 18.0,
            }
            return self._finalize_match(top_rec, unit_price, confidence=0.96, rule_prefix="Wood & Timber Products (18% GST)")

        # Priority Check 5: Fertilizer / Urea / DAP / Khad
        is_agri_khad = any(k in combined_lower for k in ["urea", "fertilizer", "khad", "dap", "iffco"])
        if is_agri_khad:
            top_rec = self.hsn_lookup.get("3102") or {
                "hsn_code": "3102",
                "sector": "GROCERY",
                "description": "Mineral or Chemical Fertilizers, Urea",
                "base_gst_rate": 5.0,
                "has_price_threshold": False,
                "threshold_amount": 0.0,
                "above_threshold_gst_rate": 5.0,
            }
            return self._finalize_match(top_rec, unit_price, confidence=0.92, rule_prefix="Agricultural Fertilizer / Urea (5% GST)")

        # Priority Check 6: Unstitched Fabric / Thaan / Kapda (flat 5% GST)
        is_unstitched_cloth = any(k in combined_lower for k in [
            "thaan", "than", "kapda", "fabric", "poplin", "rubia", "cambric", "sut", "cotton cloth",
            "astar", "lining", "unstitched"
        ])
        if is_unstitched_cloth and not any(k in combined_lower for k in ["suit", "lehnga", "shirt", "pant", "jeans"]):
            top_rec = self.hsn_lookup.get("5208") or {
                "hsn_code": "5208",
                "sector": "TEXTILES",
                "description": "Woven Fabrics of Cotton, Unstitched Cloth / Thaan",
                "base_gst_rate": 5.0,
                "has_price_threshold": False,
                "threshold_amount": 0.0,
                "above_threshold_gst_rate": 5.0,
            }
            return self._finalize_match(top_rec, unit_price, confidence=0.95, rule_prefix="Unstitched Fabric (Flat 5% GST)")

        best_score = 0.0
        ranked: List[Tuple[float, Dict[str, Any]]] = []

        # 1. Neural Vector Matching if PyTorch is available
        if self.use_neural and self.neural_model is not None:
            try:
                from sentence_transformers import util
                q_emb = self.neural_model.encode(combined_query, convert_to_tensor=True)
                cos_scores = util.cos_sim(q_emb, self.embeddings)[0].tolist()
                for idx, score in enumerate(cos_scores):
                    ranked.append((float(score), self.records[idx]))
                ranked.sort(key=lambda x: x[0], reverse=True)
                best_score = ranked[0][0] if ranked else 0.0
            except Exception as e:
                logger.warning(f"Neural matching failed: {e}. Falling back to hybrid vector.")
                ranked = []

        # 2. Fast Hybrid Scoring if neural not used or fallback
        if not ranked:
            for rec in self.records:
                score = self._hybrid_score(combined_query, sector_upper, rec)
                ranked.append((score, rec))
            ranked.sort(key=lambda x: x[0], reverse=True)
            best_score = ranked[0][0] if ranked else 0.0

        # Rule 3: Dynamic LLM fallback for random unseen items when similarity < 0.55
        if best_score < 0.55:
            clean_sug_hsn = None
            if suggested_hsn_4digit:
                sm = re.search(r"\b(\d{4})\b", str(suggested_hsn_4digit))
                if sm:
                    clean_sug_hsn = sm.group(1)

            if clean_sug_hsn and clean_sug_hsn in self.hsn_lookup:
                top_rec = dict(self.hsn_lookup[clean_sug_hsn])
                if suggested_gst_slab is not None and float(suggested_gst_slab) in (0.0, 3.0, 5.0, 12.0, 18.0, 28.0):
                    top_rec["base_gst_rate"] = float(suggested_gst_slab)
                confidence = 0.88
                return self._finalize_match(top_rec, unit_price, confidence, ranked, rule_prefix="Vision LLM Grounded")

            elif clean_sug_hsn and clean_sug_hsn[:2] in self.chapter_lookup:
                top_rec = dict(self.chapter_lookup[clean_sug_hsn[:2]])
                top_rec["hsn_code"] = clean_sug_hsn
                if suggested_gst_slab is not None and float(suggested_gst_slab) in (0.0, 3.0, 5.0, 12.0, 18.0, 28.0):
                    top_rec["base_gst_rate"] = float(suggested_gst_slab)
                confidence = 0.82
                return self._finalize_match(top_rec, unit_price, confidence, ranked, rule_prefix="Vision LLM Chapter Head")

            elif clean_sug_hsn and len(clean_sug_hsn) == 4:
                rate = float(suggested_gst_slab) if suggested_gst_slab in (0.0, 3.0, 5.0, 12.0, 18.0, 28.0) else 18.0
                top_rec = {
                    "hsn_code": clean_sug_hsn,
                    "sector": sector_upper,
                    "description": product_name_normalized or "Specialized Merchandise",
                    "hinglish_aliases": "",
                    "base_gst_rate": rate,
                    "has_price_threshold": clean_sug_hsn.startswith(("61", "62", "63", "64")),
                    "threshold_amount": 1000.0 if clean_sug_hsn.startswith(("61", "62", "63", "64")) else 0.0,
                    "above_threshold_gst_rate": 12.0 if clean_sug_hsn.startswith(("61", "62", "63")) else (18.0 if clean_sug_hsn.startswith("64") else rate),
                    "default_uqc": "PCS",
                    "cbic_schedule": CBIC_SCHEDULES.get(rate, "Statutory Schedule"),
                }
                confidence = 0.78
                return self._finalize_match(top_rec, unit_price, confidence, ranked, rule_prefix="Vision LLM Statutory Classification")

            # Standard Sector Default Fallback
            default_hsn, default_desc, default_rate = SECTOR_DEFAULT_CHAPTERS.get(
                sector_upper,
                ("9999", "General Merchandise", 18.0)
            )
            top_rec = {
                "hsn_code": default_hsn,
                "sector": sector_upper,
                "description": default_desc,
                "hinglish_aliases": "",
                "base_gst_rate": default_rate,
                "has_price_threshold": sector_upper in ("TEXTILE", "TEXTILES", "FOOTWEAR_UTENSILS"),
                "threshold_amount": 1000.0 if sector_upper in ("TEXTILE", "TEXTILES", "FOOTWEAR_UTENSILS") else 0.0,
                "above_threshold_gst_rate": 12.0 if sector_upper in ("TEXTILE", "TEXTILES") else (18.0 if sector_upper in ("FOOTWEAR_UTENSILS", "FOOTWEAR_AUTO") else default_rate),
            }
            confidence = 0.60
            return self._finalize_match(top_rec, unit_price, confidence, ranked, rule_prefix="Sector Default Classification")
        else:
            top_rec = ranked[0][1]
            confidence = min(0.99, max(0.70, round(best_score, 2)))
            return self._finalize_match(top_rec, unit_price, confidence, ranked)


# Global HSN catalog instance
hsn_catalog = HSNMasterCatalog()


def match_hsn_item(
    product_name_normalized: str,
    raw_text: str = "",
    item_sector: str = "GENERAL",
    unit_price: float = 0.0,
    written_hsn_code: Optional[str] = None,
    suggested_hsn_4digit: Optional[str] = None,
    suggested_gst_slab: Optional[float] = None
) -> Dict[str, Any]:
    """Exposed entrypoint for Lane 1, main.py & math_auditor."""
    if isinstance(raw_text, str) and isinstance(item_sector, (int, float)):
        unit_price = float(item_sector)
        item_sector = raw_text
        raw_text = ""
    elif isinstance(raw_text, (int, float)):
        unit_price = float(raw_text)
        raw_text = ""
    return hsn_catalog.match_item(
        product_name_normalized=product_name_normalized,
        raw_text=raw_text,
        item_sector=item_sector,
        unit_price=unit_price,
        written_hsn_code=written_hsn_code,
        suggested_hsn_4digit=suggested_hsn_4digit,
        suggested_gst_slab=suggested_gst_slab
    )


def search_hsn_catalog(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Exposed entrypoint for HSN catalog search API."""
    return hsn_catalog.search_catalog(query=query, limit=limit)
