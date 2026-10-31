import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find all document.getElementById("...") in the script
script_ids = set(re.findall(r'document\.getElementById\([\"\']([^\"\']+)[\"\']\)', html))
print(f"Total unique IDs referenced in script: {len(script_ids)}")

html_ids = set(re.findall(r'id=[\"\']([^\"\']+)[\"\']', html))
print(f"Total unique IDs defined in HTML: {len(html_ids)}")

missing = script_ids - html_ids
for m in sorted(missing):
    print(f"MISSING ID: {m}")

