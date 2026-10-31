import json
import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Extract renderInvoiceUI body
match = re.search(r'function renderInvoiceUI\(\) \{(.*?)\n    \}', html, re.DOTALL)
if match:
    code = match.group(1)
    print("Found renderInvoiceUI code length:", len(code))
    
    # Extract all document.getElementById calls
    ids = re.findall(r'document\.getElementById\([\"\']([^\"\']+)[\"\']\)', code)
    print("IDs accessed in renderInvoiceUI:", ids)
    
    for el_id in ids:
        # Check if id exists in html
        pattern = rf'id=[\"\']{re.escape(el_id)}[\"\']'
        if not re.search(pattern, html):
            print(f"CRITICAL BUG -> ID NOT FOUND IN HTML: {el_id}")
        else:
            print(f"OK: {el_id}")
else:
    print("renderInvoiceUI not found")

