import os
import re
import shutil

src_dir = '/home/johnson/Desktop/Johnson/PTA/Eventos/do_zero_a_consultoria_online'
dist_dir = os.path.join(src_dir, 'dist')

# Create directories
os.makedirs(os.path.join(dist_dir, 'css'), exist_ok=True)
os.makedirs(os.path.join(dist_dir, 'js'), exist_ok=True)
os.makedirs(os.path.join(dist_dir, 'assets'), exist_ok=True)

# Copy assets
shutil.copytree(os.path.join(src_dir, 'assets'), os.path.join(dist_dir, 'assets'), dirs_exist_ok=True)

# Read index.html
with open(os.path.join(src_dir, 'index.html'), 'r', encoding='utf-8') as f:
    html = f.read()

# Extract styles
style_pattern = re.compile(r'<style>(.*?)</style>', re.DOTALL)
styles = []
def replace_style(match):
    styles.append(match.group(1))
    return '<link rel="stylesheet" href="css/style.css">'
html = style_pattern.sub(replace_style, html)

# Minify CSS
if styles:
    combined_css = '\n'.join(styles)
    combined_css = re.sub(r'/\*.*?\*/', '', combined_css, flags=re.DOTALL)
    combined_css = re.sub(r'\s+', ' ', combined_css).strip()
    with open(os.path.join(dist_dir, 'css', 'style.css'), 'w', encoding='utf-8') as f:
        f.write(combined_css)

# Extract main script
script_pattern = re.compile(r'<script>\s*(// 1\. Inicializa AOS.*?)</script>', re.DOTALL)
scripts = []
def replace_script(match):
    scripts.append(match.group(1))
    return '<script src="js/main.js" defer></script>'
html = script_pattern.sub(replace_script, html)

# Minify JS
if scripts:
    combined_js = '\n'.join(scripts)
    js_modified = []
    for line in combined_js.split('\n'):
        # Just simple strip to not break nested quotes with // inside
        l = line.strip()
        if l.startswith('//'):
            continue
        js_modified.append(l)
    combined_js = ' '.join(js_modified)
    # Remove extra spaces
    combined_js = re.sub(r'\s+', ' ', combined_js).strip()
    with open(os.path.join(dist_dir, 'js', 'main.js'), 'w', encoding='utf-8') as f:
        f.write(combined_js)

# Minify HTML
# Remove all comments EXCEPT GTM
def keep_gtm_comments(match):
    comment = match.group(0)
    if 'Google Tag Manager' in comment:
        return comment
    return ''

html = re.sub(r'<!--(.*?)-->', keep_gtm_comments, html, flags=re.DOTALL)

# Strip whitespace between tags
html = re.sub(r'>\s+<', '><', html)

with open(os.path.join(dist_dir, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(html.strip())

print("Build successfully completed!")
