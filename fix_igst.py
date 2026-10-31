with open("main.py", "r", encoding="utf-8") as f:
    c = f.read()

target = """        # Statutory IGST Rule: Inter-State when Supplier State != Place of Supply State
        if payload.get("is_inter_state") is not None:
            is_inter_state = bool(payload.get("is_inter_state"))
        else:
            is_inter_state = bool(supplier_state and pos_code and (supplier_state != pos_code))"""

replacement = """        # Statutory IGST Rule (Section 7 of IGST Act): Inter-State when Supplier State != Place of Supply State
        if supplier_state and pos_code:
            is_inter_state = bool(supplier_state != pos_code)
        elif payload.get("is_inter_state") is not None:
            is_inter_state = bool(payload.get("is_inter_state"))
        else:
            is_inter_state = False"""

if target in c:
    c = c.replace(target, replacement)
    print("Found and replaced in main.py!")
else:
    # try replacing regardless of line endings
    c = c.replace(target.replace("\n", "\r\n"), replacement.replace("\n", "\r\n"))
    print("Found and replaced with CRLF in main.py!")

with open("main.py", "w", encoding="utf-8") as f:
    f.write(c)
with open("backend/main.py", "w", encoding="utf-8") as f:
    f.write(c)

print("Fixed IGST logic in main.py & backend/main.py!")

