---
name: dynamic-feature-injector
description: Use whenever adding a new feature mid-hackathon (e.g., WhatsApp Bill Share, Voice Item Entry, E-Way Bill Generator, Khata Ledger, Multi-Language Bill Toggle).
---

<ADDITIVE_PLUGIN_LAWS>
1. NEVER MUTATE CORE FILES: Do not alter `hsn_matcher.py`, `math_auditor.py`, or existing fields in `backend/schemas.py`. Any new schema fields MUST be `Optional[T] = None`.
2. ISOLATED EXTENSION SLICES:
   - Backend: Create `backend/ext_<feature>.py` with an isolated `APIRouter(prefix="/api/ext/<feature>")` and mount it in `main.py`.
   - Frontend: Create `frontend/src/components/ext/<FeatureName>.jsx` and render it as a collapsible card or modal tab with pre-seeded fallback data.
</ADDITIVE_PLUGIN_LAWS>
