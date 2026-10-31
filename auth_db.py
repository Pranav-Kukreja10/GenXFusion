"""
TrueTax AI — SQLite + JWT Auth & Multi-GSTIN Merchant Profile System
Provides zero-config SQLite storage in data/truetax.db, PBKDF2 password hashing,
RFC-7519 compliant HS256 JWT tokens, and multi-state GSTIN branch management.
"""

import os
import sqlite3
import hashlib
import hmac
import json
import base64
import time
from typing import Optional, Dict, Any, List
from pathlib import Path
from gst_validator import validate_gstin, INDIAN_STATES

DB_PATH = Path("data") / "truetax.db" if (Path("data") / "truetax.db").exists() else Path("data") / "parchisetu.db"
JWT_SECRET = os.getenv("JWT_SECRET", "truetax_fintech_production_secret_key_2026")
JWT_ALGORITHM = "HS256"
DEFAULT_EXPIRY_SECONDS = 30 * 24 * 3600  # 30 days


def get_db_connection() -> sqlite3.Connection:
    """Returns a connection to SQLite with row factory configured."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


# ============================================================================
# 1. Cryptographic Password Hashing (PBKDF2-HMAC-SHA256)
# ============================================================================

def hash_password(password: str) -> str:
    """Hashes a password using PBKDF2-HMAC-SHA256 with a unique 16-byte salt."""
    salt = os.urandom(16)
    iterations = 100_000
    hash_bytes = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2:sha256:{iterations}${salt.hex()}${hash_bytes.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verifies a plain password against a stored PBKDF2 hash."""
    try:
        parts = stored_hash.split("$")
        if len(parts) != 3:
            return False
        iter_part, salt_hex, hash_hex = parts
        iterations = int(iter_part.split(":")[-1])
        salt = bytes.fromhex(salt_hex)
        expected_hash = bytes.fromhex(hash_hex)
        computed_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(computed_hash, expected_hash)
    except Exception:
        return False


# ============================================================================
# 2. Standard-Compliant HS256 JWT Implementation (Zero-Dependency)
# ============================================================================

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = 4 - (len(data) % 4)
    if padding != 4:
        data += "=" * padding
    return base64.urlsafe_b64decode(data)


def create_access_token(user_id: int, email_or_phone: str, expires_in: int = DEFAULT_EXPIRY_SECONDS) -> str:
    """Generates an RFC 7519 compliant HS256 JWT access token."""
    now = int(time.time())
    header = {"alg": JWT_ALGORITHM, "typ": "JWT"}
    payload = {
        "sub": str(user_id),
        "user_id": user_id,
        "email_or_phone": email_or_phone,
        "iat": now,
        "exp": now + expires_in
    }

    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")

    signature = hmac.new(JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a JWT token. Returns payload dict or None if invalid/expired."""
    try:
        parts = token.strip().split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts

        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
        expected_sig = hmac.new(JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
        actual_sig = _b64url_decode(sig_b64)

        if not hmac.compare_digest(expected_sig, actual_sig):
            return None

        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        if payload.get("exp", 0) < time.time():
            return None  # Expired

        return payload
    except Exception:
        return None


# ============================================================================
# 3. Database Schema Initialization & Auto-Seed
# ============================================================================

def init_db():
    """Initializes SQLite tables and seeds the demo account with 3 multi-state GSTIN branches."""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email_or_phone TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                contact_phone TEXT,
                default_business_name TEXT,
                created_at TEXT NOT NULL
            );
        """)

        # Merchant GSTIN branches table (1-to-Many)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS merchant_gstins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                gstin TEXT NOT NULL,
                trade_name TEXT NOT NULL,
                state_code TEXT NOT NULL,
                state_name TEXT NOT NULL,
                branch_address TEXT,
                branch_phone TEXT,
                invoice_prefix TEXT,
                is_default INTEGER DEFAULT 0,
                UNIQUE(user_id, gstin)
            );
        """)

        conn.commit()

        # Seed Demo Account if not exists
        _seed_demo_account(cursor, conn)


def _seed_demo_account(cursor: sqlite3.Cursor, conn: sqlite3.Connection):
    """Pre-loads verified demo account with 3 multi-state GSTIN profiles (Punjab, MP, Delhi)."""
    cursor.execute("SELECT id FROM users WHERE email_or_phone IN ('demo@truetax.in', 'demo@parchisetu.in');")
    row = cursor.fetchone()

    demo_user_id = None
    if not row:
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        pwd_hash = hash_password("demo1234")
        cursor.execute("""
            INSERT INTO users (email_or_phone, password_hash, full_name, contact_phone, default_business_name, created_at)
            VALUES (?, ?, ?, ?, ?, ?);
        """, ("demo@truetax.in", pwd_hash, "Sandeep Goyal (Demo Merchant)", "9876543210", "TrueTax Enterprises", now_iso))
        demo_user_id = cursor.lastrowid
        conn.commit()
    else:
        demo_user_id = row["id"]

    # Verify/Seed 3 Branches for Demo User
    demo_branches = [
        {
            "gstin": "03AAEPG1807C1ZM",
            "trade_name": "TrueTax Textiles & Readymade — Ludhiana HQ",
            "state_code": "03",
            "state_name": "Punjab",
            "branch_address": "Shop 42, Chaura Bazar, Near Clock Tower, Ludhiana, Punjab - 141008",
            "branch_phone": "98765-43210",
            "invoice_prefix": "PB/26-27/",
            "is_default": 1
        },
        {
            "gstin": "23BXDPP0256Q1Z6",
            "trade_name": "Radhe Krishna Agency — Bhikangaon Branch",
            "state_code": "23",
            "state_name": "Madhya Pradesh",
            "branch_address": "Soni Colony, Amankhedi Road, Bhikangaon, Khargone (M.P.) - 451331",
            "branch_phone": "91656-06305",
            "invoice_prefix": "MP/26-27/",
            "is_default": 0
        },
        {
            "gstin": "07AAECG1807C1Z5",
            "trade_name": "TrueTax Corporate Hub — Delhi Branch",
            "state_code": "07",
            "state_name": "Delhi",
            "branch_address": "F-Block, Connaught Place, New Delhi, Delhi - 110001",
            "branch_phone": "98111-22334",
            "invoice_prefix": "DL/26-27/",
            "is_default": 0
        }
    ]

    for b in demo_branches:
        cursor.execute("SELECT id FROM merchant_gstins WHERE user_id = ? AND gstin = ?;", (demo_user_id, b["gstin"]))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO merchant_gstins (user_id, gstin, trade_name, state_code, state_name, branch_address, branch_phone, invoice_prefix, is_default)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (demo_user_id, b["gstin"], b["trade_name"], b["state_code"], b["state_name"], b["branch_address"], b["branch_phone"], b["invoice_prefix"], b["is_default"]))
    conn.commit()


# ============================================================================
# 4. Auth & Merchant Management Operations
# ============================================================================

def register_user(
    email_or_phone: str,
    password: str,
    full_name: str,
    contact_phone: str = "",
    default_business_name: str = "",
    initial_gstin: Optional[str] = None
) -> Dict[str, Any]:
    """Registers a new merchant user and optional primary GSTIN branch."""
    clean_identifier = email_or_phone.strip().lower()
    if not clean_identifier or not password or not full_name:
        raise ValueError("email_or_phone, password, and full_name are required.")

    pwd_hash = hash_password(password)
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    with get_db_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute("""
                INSERT INTO users (email_or_phone, password_hash, full_name, contact_phone, default_business_name, created_at)
                VALUES (?, ?, ?, ?, ?, ?);
            """, (clean_identifier, pwd_hash, full_name.strip(), contact_phone.strip(), default_business_name.strip(), now_iso))
            user_id = cursor.lastrowid
        except sqlite3.IntegrityError:
            raise ValueError(f"An account with identifier '{clean_identifier}' already exists.")

        conn.commit()

    # If an initial GSTIN was provided, add it
    if initial_gstin and initial_gstin.strip():
        try:
            add_merchant_gstin(
                user_id=user_id,
                gstin=initial_gstin.strip().upper(),
                trade_name=default_business_name or full_name,
                branch_address="",
                branch_phone=contact_phone,
                is_default=True
            )
        except Exception:
            pass  # Non-fatal if initial GSTIN is invalid on registration

    return get_user_profile(user_id)


def authenticate_user(email_or_phone: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticates credentials and returns user profile + GSTIN branches."""
    clean_identifier = email_or_phone.strip().lower()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email_or_phone = ?;", (clean_identifier,))
        row = cursor.fetchone()
        if not row:
            # Also attempt contact_phone lookup
            cursor.execute("SELECT * FROM users WHERE contact_phone = ?;", (clean_identifier,))
            row = cursor.fetchone()

        if not row or not verify_password(password, row["password_hash"]):
            return None

        user_id = row["id"]

    return get_user_profile(user_id)


def get_user_profile(user_id: int) -> Optional[Dict[str, Any]]:
    """Returns user profile dictionary along with all configured merchant_gstins."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email_or_phone, full_name, contact_phone, default_business_name, created_at FROM users WHERE id = ?;", (user_id,))
        user_row = cursor.fetchone()
        if not user_row:
            return None

        user_dict = dict(user_row)
        cursor.execute("""
            SELECT id, gstin, trade_name, state_code, state_name, branch_address, branch_phone, invoice_prefix, is_default
            FROM merchant_gstins
            WHERE user_id = ?
            ORDER BY is_default DESC, id ASC;
        """, (user_id,))
        gstins = [dict(r) for r in cursor.fetchall()]

    user_dict["merchant_gstins"] = gstins
    user_dict["default_gstin"] = next((g for g in gstins if g["is_default"]), (gstins[0] if gstins else None))
    return user_dict


def add_merchant_gstin(
    user_id: int,
    gstin: str,
    trade_name: str,
    branch_address: str = "",
    branch_phone: str = "",
    invoice_prefix: str = "",
    is_default: bool = False
) -> Dict[str, Any]:
    """Adds a new GSTIN branch after validating Mod-36 checksum. Automatically sets state_code and state_name."""
    clean_gstin = gstin.strip().upper()
    val_result = validate_gstin(clean_gstin)
    if not val_result.get("is_valid"):
        raise ValueError(f"Invalid GSTIN '{clean_gstin}': {val_result.get('error_reason', 'Failed Mod-36 Checksum')}")

    state_code = val_result["state_code"]
    state_name = val_result["state_name"]

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Check existing count
        cursor.execute("SELECT COUNT(*) as count FROM merchant_gstins WHERE user_id = ?;", (user_id,))
        count = cursor.fetchone()["count"]

        # First branch is always default
        make_default = 1 if (is_default or count == 0) else 0

        if make_default == 1:
            cursor.execute("UPDATE merchant_gstins SET is_default = 0 WHERE user_id = ?;", (user_id,))

        try:
            cursor.execute("""
                INSERT INTO merchant_gstins (user_id, gstin, trade_name, state_code, state_name, branch_address, branch_phone, invoice_prefix, is_default)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (user_id, clean_gstin, trade_name.strip(), state_code, state_name, branch_address.strip(), branch_phone.strip(), invoice_prefix.strip(), make_default))
            gstin_id = cursor.lastrowid
            conn.commit()
        except sqlite3.IntegrityError:
            raise ValueError(f"GSTIN '{clean_gstin}' is already added to this merchant profile.")

    return {
        "id": gstin_id,
        "user_id": user_id,
        "gstin": clean_gstin,
        "trade_name": trade_name.strip(),
        "state_code": state_code,
        "state_name": state_name,
        "branch_address": branch_address.strip(),
        "branch_phone": branch_phone.strip(),
        "invoice_prefix": invoice_prefix.strip(),
        "is_default": bool(make_default)
    }


def set_default_gstin(user_id: int, gstin_id: int) -> bool:
    """Sets a specific GSTIN branch as the default for quick-fill and invoice generation."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM merchant_gstins WHERE id = ? AND user_id = ?;", (gstin_id, user_id))
        if not cursor.fetchone():
            return False

        cursor.execute("UPDATE merchant_gstins SET is_default = 0 WHERE user_id = ?;", (user_id,))
        cursor.execute("UPDATE merchant_gstins SET is_default = 1 WHERE id = ? AND user_id = ?;", (gstin_id, user_id))
        conn.commit()
        return True


def delete_merchant_gstin(user_id: int, gstin_id: int) -> bool:
    """Deletes a GSTIN branch and promotes another branch to default if needed."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT is_default FROM merchant_gstins WHERE id = ? AND user_id = ?;", (gstin_id, user_id))
        row = cursor.fetchone()
        if not row:
            return False

        was_default = bool(row["is_default"])
        cursor.execute("DELETE FROM merchant_gstins WHERE id = ? AND user_id = ?;", (gstin_id, user_id))

        if was_default:
            # Promote next branch
            cursor.execute("SELECT id FROM merchant_gstins WHERE user_id = ? LIMIT 1;", (user_id,))
            next_row = cursor.fetchone()
            if next_row:
                cursor.execute("UPDATE merchant_gstins SET is_default = 1 WHERE id = ?;", (next_row["id"],))

        conn.commit()
        return True


def get_demo_login_response() -> Dict[str, Any]:
    """1-click Instant Demo Login returning JWT token, user profile, and 3 GSTIN branches."""
    init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email_or_phone FROM users WHERE email_or_phone IN ('demo@truetax.in', 'demo@parchisetu.in');")
        row = cursor.fetchone()
        if not row:
            raise RuntimeError("Demo account could not be initialized.")
        user_id = row["id"]
        email = row["email_or_phone"]

    token = create_access_token(user_id=user_id, email_or_phone=email)
    profile = get_user_profile(user_id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": profile,
        "merchant_gstins": profile.get("merchant_gstins", []),
        "default_gstin": profile.get("default_gstin")
    }
