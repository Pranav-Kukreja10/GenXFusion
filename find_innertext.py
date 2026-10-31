import re

with open('static/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines, 1):
    if '.innerText' in line:
        safe_line = line.strip().encode('ascii', errors='replace').decode('ascii')
        print(f"L{i}: {safe_line}")
