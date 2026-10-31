import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find all document.getElementById
id_calls = re.findall(r'document\.getElementById\([\"\']([^\"\']+)[\"\']\)', html)
id_defs = set(re.findall(r'id=[\"\']([^\"\']+)[\"\']', html))

missing = {}
for i, line in enumerate(html.splitlines(), 1):
    m = re.findall(r'document\.getElementById\([\"\']([^\"\']+)[\"\']\)', line)
    for el_id in m:
        if el_id not in id_defs:
            if el_id not in missing:
                missing[el_id] = []
            missing[el_id].append(i)

print(f"Missing IDs count: {len(missing)}")
for el_id, lines in missing.items():
    print(f"ID '{el_id}' referenced on lines {lines} is NOT defined in HTML!")

