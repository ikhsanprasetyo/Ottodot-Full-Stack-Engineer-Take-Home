import os
import glob

files = glob.glob('d:/Project/Website/web-rtu-sinar-utama/client/app/rtu/**/*.tsx', recursive=True)

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    modified = False
    if '<z.infer<typeof formSchema>>' in content:
        content = content.replace('useForm<z.infer<typeof formSchema>>', 'useForm<any>')
        content = content.replace('values: z.infer<typeof formSchema>', 'values: any')
        modified = True
        
    if modified:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {file}")
