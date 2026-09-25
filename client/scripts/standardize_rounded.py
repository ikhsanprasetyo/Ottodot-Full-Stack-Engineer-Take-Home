import os
import re

# Patterns to replace
# 1. Base rounded classes (rounded, rounded-md, rounded-lg, etc.)
# 2. Side classes (rounded-t, rounded-t-md, etc.)
# 3. Corner classes (rounded-tl, rounded-tl-md, etc.)

# We EXCLUDE rounded-full, rounded-none, rounded-sm (already sm)

base_pattern = re.compile(r'\brounded(?!(?:-sm|-full|-none|-[\w]))\b')
size_suffix_pattern = re.compile(r'\brounded-(md|lg|xl|2xl|3xl)\b')

# Directional side patterns: rounded-t, rounded-t-md, rounded-t-lg...
side_pattern = re.compile(r'\brounded-([tblr])(?!(?:-sm|-full|-none))\b')
side_size_pattern = re.compile(r'\brounded-([tblr])-(md|lg|xl|2xl|3xl)\b')

# Directional corner patterns: rounded-tl, rounded-tl-md...
corner_pattern = re.compile(r'\brounded-([tb][lr])(?!(?:-sm|-full|-none))\b')
corner_size_pattern = re.compile(r'\brounded-([tb][lr])-(md|lg|xl|2xl|3xl)\b')

directory = 'd:/Project/Website/web-rtu-sinar-utama/client'
extensions = ('.tsx', '.ts', '.css')

def replace_rounded(content):
    # Order matters to avoid partial replacements
    
    # 1. Corner with sizes
    content = corner_size_pattern.sub(r'rounded-\1-sm', content)
    # 2. Side with sizes
    content = side_size_pattern.sub(r'rounded-\1-sm', content)
    # 3. Base with sizes
    content = size_suffix_pattern.sub(r'rounded-sm', content)
    
    # 4. Corner without sizes (e.g. rounded-tl)
    content = corner_pattern.sub(r'rounded-\1-sm', content)
    # 5. Side without sizes (e.g. rounded-t)
    content = side_pattern.sub(r'rounded-\1-sm', content)
    # 6. Base without sizes (e.g. rounded)
    content = base_pattern.sub(r'rounded-sm', content)
    
    return content

count = 0
for root, dirs, files in os.walk(directory):
    if 'node_modules' in dirs:
        dirs.remove('node_modules')
    if '.next' in dirs:
        dirs.remove('.next')
        
    for file in files:
        if file.endswith(extensions):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    old_content = f.read()
                
                new_content = replace_rounded(old_content)
                
                if old_content != new_content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated: {path}")
                    count += 1
            except Exception as e:
                print(f"Error processing {path}: {e}")

print(f"Total files updated: {count}")
