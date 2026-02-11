"""Build-time warmup: convert a tiny PDF to force all model downloads."""

import tempfile, os

# Create a minimal valid PDF with actual text content.
# This triggers Docling's full PDF pipeline: layout analysis,
# table detection, OCR, etc.  All HuggingFace Hub models get
# downloaded and cached in the Docker image layer.
PDF_BYTES = (
    b"%PDF-1.4\n"
    b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R"
    b"/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n"
    b"4 0 obj<</Length 44>>stream\n"
    b"BT /F1 12 Tf 100 700 Td (Hello World) Tj ET\n"
    b"endstream endobj\n"
    b"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
    b"xref\n0 6\n"
    b"0000000000 65535 f \n"
    b"0000000009 00000 n \n"
    b"0000000058 00000 n \n"
    b"0000000115 00000 n \n"
    b"0000000266 00000 n \n"
    b"0000000360 00000 n \n"
    b"trailer<</Size 6/Root 1 0 R>>\n"
    b"startxref\n430\n%%EOF"
)

with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
    f.write(PDF_BYTES)
    tmp = f.name

try:
    from docling.document_converter import DocumentConverter

    print("Warming up Docling PDF pipeline (downloading models)...")
    converter = DocumentConverter()
    result = converter.convert(tmp)
    md = result.document.export_to_markdown()
    print(f"Warmup complete — got {len(md)} chars of markdown")
except Exception as e:
    # Print but don't fail the build — models may still be partially cached.
    print(f"Warmup conversion raised: {e}")
    print("Models may be partially cached; PDF conversion might still work at runtime.")
finally:
    os.unlink(tmp)