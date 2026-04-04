import markdown2
from fpdf import FPDF
import os

# Paths
md_path = "AI_ATTENTION_REPORT.md"
pdf_path = "AI_ATTENTION_REPORT.pdf"

# Read markdown
with open(md_path, "r", encoding="utf-8") as f:
    md_content = f.read()

# Convert markdown to HTML
html = markdown2.markdown(md_content)

# Simple HTML to text (strip tags for FPDF)
from html.parser import HTMLParser
class MLStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.reset()
        self.fed = []
    def handle_data(self, d):
        self.fed.append(d)
    def get_data(self):
        return ''.join(self.fed)

def strip_tags(html):
    s = MLStripper()
    s.feed(html)
    return s.get_data()

text = strip_tags(html)

# Create PDF
pdf = FPDF()
pdf.add_page()
pdf.set_auto_page_break(auto=True, margin=15)
pdf.set_font("Arial", size=12)


# Write each line, replacing unsupported characters for latin-1
for line in text.split('\n'):
    safe_line = line.encode('latin-1', 'replace').decode('latin-1')
    pdf.multi_cell(0, 10, safe_line)

pdf.output(pdf_path)
print(f"PDF created: {pdf_path}")
