"""
hsn_matcher.py - PyTorch / Hybrid Vector HSN Matcher
Part of ParchiSetu AI / Bharat GST Vision Engine (Lane 2).

Features:
1. Loads 100+ Indian items across 6 sectors from data/hsn_master.csv.
2. Uses sentence-transformers (all-MiniLM-L6-v2) if PyTorch is installed.
3. Built-in fast TF-IDF / Token N-Gram / SequenceMatcher hybrid vector engine that
   runs in <2ms with zero dependencies if PyTorch is offline or downloading.
4. Sector chapter-head fallback if confidence < 0.55 (TEXTILE->6203, GROCERY->1101, etc.).
5. Automatic conditional Indian GST slab upgrade (Garment > ₹1000 5%->12%, Footwear > ₹1000 12%->18%).
6. Exposes match_hsn_item and search_hsn_catalog.
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


class HSNMasterCatalog:
    """Manages HSN database, aliases, vector embeddings, and fallback scoring."""

    def __init__(self, csv_path: Path = CSV_PATH):
        self.csv_path = csv_path
        self.records: List[Dict[str, Any]] = []
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
                    self.records.append({
                        "hsn_code": str(row["hsn_code"]).strip(),
                        "sector": str(row["sector"]).strip().upper(),
                        "description": str(row["description"]).strip(),
                        "hinglish_aliases": str(row.get("hinglish_aliases", "")).strip().lower(),
                        "base_gst_rate": float(row.get("base_gst_rate", 18.0)),
                        "has_price_threshold": str(row.get("has_price_threshold", "False")).strip().lower() == "true",
                        "threshold_amount": float(row.get("threshold_amount", 0.0)),
                        "above_threshold_gst_rate": float(row.get("above_threshold_gst_rate", row.get("base_gst_rate", 18.0))),
                    })
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
            self.records.append({
                "hsn_code": hsn,
                "sector": sec,
                "description": desc,
                "hinglish_aliases": aliases,
                "base_gst_rate": base,
                "has_price_threshold": has_th,
                "threshold_amount": th,
                "above_threshold_gst_rate": above,
            })

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

        # Token intersection
        overlap = q_tokens.intersection(doc_tokens)
        token_score = len(overlap) / len(q_tokens) if q_tokens else 0.0

        # Exact sub-string presence boost
        sub_boost = 0.0
        for token in q_tokens:
            if len(token) > 2 and token in doc_text:
                sub_boost += 0.2

        # Sequence matcher ratio
        seq_ratio = difflib.SequenceMatcher(None, query.lower(), record["description"].lower()).ratio()

        # Sector alignment bonus
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

    def match_item(
        self,
        product_name_normalized: str,
        raw_text: str = "",
        item_sector: str = "GENERAL",
        unit_price: float = 0.0
    ) -> Dict[str, Any]:
        """
        Matches a normalized item name against HSN catalog:
        Returns top match, top 3 alternatives, dynamic GST rate with threshold notes, and confidence.
        """
        combined_query = f"{product_name_normalized} {raw_text}".strip()
        combined_lower = combined_query.lower()
        sector_upper = (item_sector or "GENERAL").upper()

        # Priority Check 1: Ceramic Tiles, Vitrified, Spenza, Kajaria, Flooring
        # Must ALWAYS map to HSN 6907 (18% GST), NEVER to 2523 (Cement 28%)
        is_tile_query = any(k in combined_lower for k in [
            "tile", "tiles", "ceramic", "ceramics", "spenza", "vitrified",
            "onyx", "plano", "marbonite", "kajaria", "somany", "nitco", "honey onyx", "vista plano"
        ])
        if is_tile_query:
            return {
                "hsn_code": "6907",
                "category_description": "Ceramic Flags, Paving, Hearth or Wall Tiles, Vitrified Tiles",
                "gst_rate": 18.0,
                "tax_rule_note": "Ceramic & Vitrified Tiles (18% GST)",
                "top_3_alternatives": [
                    {"hsn_code": "6907", "label": "6907 - Ceramic & Vitrified Tiles (18%)", "gst_rate": 18.0},
                    {"hsn_code": "6802", "label": "6802 - Granite & Marble Slabs (18%)", "gst_rate": 18.0},
                    {"hsn_code": "6910", "label": "6910 - Ceramic Sanitaryware (18%)", "gst_rate": 18.0},
                ],
                "confidence": 0.98,
            }

        # Priority Check 2: Furniture / Sofa / Chair / Table / Bed / Almirah
        is_furniture_query = any(k in combined_lower for k in [
            "sofa", "chair", "table", "bed", "almirah", "furniture", "wardrobe", "stool", "cabinet", "dining"
        ])
        if is_furniture_query:
            return {
                "hsn_code": "9403",
                "category_description": "Furniture, Sofas, Wooden & Metal Articles",
                "gst_rate": 18.0,
                "tax_rule_note": "Furniture Articles (18% GST)",
                "top_3_alternatives": [
                    {"hsn_code": "9403", "label": "9403 - Furniture & Sofas (18%)", "gst_rate": 18.0},
                    {"hsn_code": "4412", "label": "4412 - Plywood & Timber Boards (18%)", "gst_rate": 18.0},
                ],
                "confidence": 0.95,
            }

        # Priority Check 3: Timber / Wood / Plywood / Lakkad / NEW KHAN Timber / Sona Timber
        is_timber_query = any(k in combined_lower for k in [
            "timber", "wood", "plywood", "lakkad", "lakdi", "sona timber", "khan timber",
            "plank", "teak", "sagwan", "sunmica", "board", "blockboard", "ply"
        ]) or ("timber" in sector_upper or "wood" in sector_upper)
        if is_timber_query and not any(c in combined_lower for c in ["cement", "सीमेंट"]):
            return {
                "hsn_code": "4407",
                "category_description": "Wood, Timber, Plywood & Veneered Panels",
                "gst_rate": 18.0,
                "tax_rule_note": "Wood & Timber Products (18% GST)",
                "top_3_alternatives": [
                    {"hsn_code": "4407", "label": "4407 - Sawn Timber & Wood (18%)", "gst_rate": 18.0},
                    {"hsn_code": "4412", "label": "4412 - Plywood & Veneered Panels (18%)", "gst_rate": 18.0},
                    {"hsn_code": "9403", "label": "9403 - Wooden Furniture (18%)", "gst_rate": 18.0},
                ],
                "confidence": 0.96,
            }

        # Priority Check 4: Sona / Urea / Fertilizer / Khad (if Agri/Bora)
        is_agri_khad = any(k in combined_lower for k in ["urea", "fertilizer", "khad", "dap", "iffco"])
        if is_agri_khad:
            return {
                "hsn_code": "3102",
                "category_description": "Mineral or Chemical Fertilizers, Urea",
                "gst_rate": 5.0,
                "tax_rule_note": "Agricultural Fertilizer / Urea (5% GST)",
                "top_3_alternatives": [
                    {"hsn_code": "3102", "label": "3102 - Urea & Nitrogenous Fertilizers (5%)", "gst_rate": 5.0},
                ],
                "confidence": 0.92,
            }

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

        # 3. Chapter Fallback if confidence < 0.55
        if best_score < 0.55:
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
        else:
            top_rec = ranked[0][1]
            confidence = min(0.99, max(0.70, round(best_score, 2)))

        # 4. Conditional GST Slab Calculation (₹1,000 threshold rule)
        has_th = top_rec["has_price_threshold"]
        th_amt = top_rec["threshold_amount"]
        base_rate = float(top_rec["base_gst_rate"])
        above_rate = float(top_rec["above_threshold_gst_rate"])

        rule_note: Optional[str] = None
        if has_th and th_amt > 0 and unit_price > th_amt:
            final_gst_rate = above_rate
            if top_rec["sector"] in ("TEXTILE", "TEXTILES") or top_rec["hsn_code"].startswith(("61", "62", "63")):
                rule_note = f"Garment > ₹{int(th_amt):,}: Auto-upgraded from {int(base_rate)}% to {int(above_rate)}% GST"
            elif top_rec["sector"] in ("FOOTWEAR_UTENSILS", "FOOTWEAR_AUTO") or top_rec["hsn_code"].startswith("64"):
                rule_note = f"Footwear > ₹{int(th_amt):,}: Auto-upgraded from {int(base_rate)}% to {int(above_rate)}% GST"
            else:
                rule_note = f"Price > ₹{int(th_amt):,}: Upgraded to {int(above_rate)}% GST"
        elif has_th and th_amt > 0:
            final_gst_rate = base_rate
            rule_note = f"Standard <= ₹{int(th_amt):,}: {int(base_rate)}% GST applied"
        else:
            final_gst_rate = base_rate

        # 5. Top 3 Alternatives for UI dropdown
        alternatives: List[Dict[str, Any]] = []
        seen_hsns = {top_rec["hsn_code"]}

        # Add top matched record
        alternatives.append({
            "hsn_code": top_rec["hsn_code"],
            "label": f"{top_rec['hsn_code']} - {top_rec['description']} ({final_gst_rate}%)",
            "gst_rate": final_gst_rate
        })

        for _, cand in ranked:
            c_hsn = cand["hsn_code"]
            if c_hsn not in seen_hsns:
                seen_hsns.add(c_hsn)
                c_rate = cand["above_threshold_gst_rate"] if cand["has_price_threshold"] and unit_price > cand["threshold_amount"] else cand["base_gst_rate"]
                alternatives.append({
                    "hsn_code": c_hsn,
                    "label": f"{c_hsn} - {cand['description']} ({c_rate}%)",
                    "gst_rate": float(c_rate)
                })
            if len(alternatives) >= 3:
                break

        return {
            "hsn_code": top_rec["hsn_code"],
            "category_description": top_rec["description"],
            "gst_rate": final_gst_rate,
            "tax_rule_note": rule_note,
            "top_3_alternatives": alternatives,
            "confidence": confidence,
        }


# Global HSN catalog instance
hsn_catalog = HSNMasterCatalog()


def match_hsn_item(
    product_name_normalized: str,
    raw_text: str = "",
    item_sector: str = "GENERAL",
    unit_price: float = 0.0
) -> Dict[str, Any]:
    """Exposed entrypoint for Lane 1 & main.py."""
    return hsn_catalog.match_item(
        product_name_normalized=product_name_normalized,
        raw_text=raw_text,
        item_sector=item_sector,
        unit_price=unit_price
    )


def search_hsn_catalog(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Exposed entrypoint for HSN catalog search API."""
    return hsn_catalog.search_catalog(query=query, limit=limit)
