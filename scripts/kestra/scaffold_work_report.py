"""Generate a structured work report for scaffold translation progress.

Outputs:
  output/scaffold-work-report.json  — structured data
  output/scaffold-work-report.html  — browsable dark-mode table with vscode:// links

Usage:
  python scripts/scaffold_work_report.py
"""

import json
import os
import re
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
ENGINE_DIR = os.path.join(PROJECT_ROOT, "engine")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "output")


def scan_scaffolds():
    results = []
    for root, dirs, files in os.walk(ENGINE_DIR):
        for f in files:
            if not f.endswith(".py"):
                continue
            path = os.path.join(root, f)
            content = open(path, encoding="utf-8", errors="replace").read()

            # Source java path
            src_m = re.search(r"# Source: (.+)", content)
            java_path = src_m.group(1).strip() if src_m else None
            if not java_path:
                continue

            # Metrics
            stubs = content.count("raise NotImplementedError")
            real_bodies = len(re.findall(r"return replace\(self", content))
            abstract_bodies = content.count("    ...")
            total_methods = len(re.findall(r"    def \w+\(", content))
            translated = real_bodies + abstract_bodies

            # Unresolved types
            unres_m = re.search(r"Unresolved types: (.+)", content)
            unresolved = unres_m.group(1).split(", ") if unres_m else []

            # Completion
            if total_methods > 0:
                completion = round(translated / total_methods * 100)
            else:
                completion = 100 if stubs == 0 else 0

            rel_py = os.path.relpath(path, PROJECT_ROOT).replace("\\", "/")
            java_norm = java_path.replace("\\", "/")

            results.append({
                "python": rel_py,
                "python_abs": os.path.abspath(path).replace("\\", "/"),
                "java": java_norm,
                "methods": total_methods,
                "stubs": stubs,
                "translated": translated,
                "completion": completion,
                "unresolved": unresolved,
                "unresolved_count": len(unresolved),
            })

    results.sort(key=lambda x: -x["stubs"])
    return results


def write_json(results):
    path = os.path.join(OUTPUT_DIR, "scaffold-work-report.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    return path


def write_html(results):
    rows = []
    for r in results:
        py_short = r["python"].replace("engine/", "")
        java_parts = r["java"].replace("\\", "/").split("io/kestra/")
        java_short = java_parts[-1] if len(java_parts) > 1 else r["java"].split("/")[-1]
        pct = r["completion"]
        cls = "low" if pct >= 50 else "med" if pct >= 10 else "high"
        bar_w = int(pct * 0.6)
        unres = ", ".join(r["unresolved"][:3])
        if len(r["unresolved"]) > 3:
            unres += "..."

        rows.append(
            f'<tr>'
            f'<td><a href="vscode://file/{r["python_abs"]}">{py_short}</a></td>'
            f'<td><a href="vscode://file/{r["java"]}">{java_short}</a></td>'
            f'<td>{r["methods"]}</td>'
            f'<td class="{cls}">{r["stubs"]}</td>'
            f'<td>{r["translated"]}</td>'
            f'<td><span class="bar-bg"><span class="bar" style="width:{bar_w}px"></span></span> {pct}%</td>'
            f'<td>{unres}</td>'
            f'</tr>'
        )

    total = len(results)
    total_stubs = sum(r["stubs"] for r in results)
    total_translated = sum(r["translated"] for r in results)
    total_methods = sum(r["methods"] for r in results)
    overall_pct = round(total_translated / total_methods * 100) if total_methods else 0

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Scaffold Work Report</title>
<style>
body {{ font-family: monospace; margin: 20px; background: #1e1e1e; color: #d4d4d4; }}
h2 {{ color: #fff; }}
.stats {{ display: flex; gap: 30px; margin-bottom: 15px; }}
.stat {{ background: #2d2d2d; padding: 12px 20px; border-radius: 6px; }}
.stat-val {{ font-size: 24px; font-weight: bold; }}
.stat-label {{ font-size: 11px; color: #888; margin-top: 4px; }}
table {{ border-collapse: collapse; width: 100%; font-size: 13px; }}
th {{ background: #2d2d2d; padding: 8px; text-align: left; position: sticky; top: 0; cursor: pointer; }}
td {{ padding: 6px 8px; border-bottom: 1px solid #333; }}
tr:hover {{ background: #2a2a2a; }}
.high {{ color: #f44; }} .med {{ color: #fa0; }} .low {{ color: #4f4; }}
a {{ color: #6bf; text-decoration: none; }}
a:hover {{ text-decoration: underline; }}
.bar {{ display: inline-block; height: 12px; background: #4f4; border-radius: 2px; }}
.bar-bg {{ display: inline-block; height: 12px; width: 60px; background: #333; border-radius: 2px; }}
input {{ background: #2d2d2d; color: #d4d4d4; border: 1px solid #555; padding: 8px 12px;
         width: 400px; margin-bottom: 15px; border-radius: 4px; font-size: 14px; }}
</style></head><body>
<h2>Scaffold Translation Work Report</h2>
<div class="stats">
  <div class="stat"><div class="stat-val">{total}</div><div class="stat-label">FILES</div></div>
  <div class="stat"><div class="stat-val">{total_methods}</div><div class="stat-label">METHODS</div></div>
  <div class="stat"><div class="stat-val" style="color:#f44">{total_stubs}</div><div class="stat-label">STUBS REMAINING</div></div>
  <div class="stat"><div class="stat-val" style="color:#4f4">{total_translated}</div><div class="stat-label">TRANSLATED</div></div>
  <div class="stat"><div class="stat-val">{overall_pct}%</div><div class="stat-label">OVERALL</div></div>
</div>
<input type="text" id="filter" placeholder="Filter by path or type..." oninput="filterTable()">
<table id="tbl">
<tr>
  <th onclick="sortTable(0)">Python File</th>
  <th onclick="sortTable(1)">Java Source</th>
  <th onclick="sortTable(2)">Methods</th>
  <th onclick="sortTable(3)">Stubs</th>
  <th onclick="sortTable(4)">Done</th>
  <th onclick="sortTable(5)">Completion</th>
  <th onclick="sortTable(6)">Unresolved Types</th>
</tr>
{"".join(rows)}
</table>
<script>
function filterTable() {{
  const v = document.getElementById('filter').value.toLowerCase();
  document.querySelectorAll('#tbl tr').forEach((r,i) => {{
    if (i===0) return;
    r.style.display = r.textContent.toLowerCase().includes(v) ? '' : 'none';
  }});
}}
let sortDir = {{}};
function sortTable(col) {{
  const tbl = document.getElementById('tbl');
  const rows = Array.from(tbl.rows).slice(1);
  sortDir[col] = !sortDir[col];
  rows.sort((a,b) => {{
    let av = a.cells[col].textContent.trim();
    let bv = b.cells[col].textContent.trim();
    let an = parseFloat(av), bn = parseFloat(bv);
    if (!isNaN(an) && !isNaN(bn)) return sortDir[col] ? an-bn : bn-an;
    return sortDir[col] ? av.localeCompare(bv) : bv.localeCompare(av);
  }});
  rows.forEach(r => tbl.appendChild(r));
}}
</script></body></html>"""

    path = os.path.join(OUTPUT_DIR, "scaffold-work-report.html")
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    return path


def write_markdown(results):
    total_stubs = sum(r["stubs"] for r in results)
    total_methods = sum(r["methods"] for r in results)
    total_translated = sum(r["translated"] for r in results)

    lines = [
        "# Scaffold Work Report",
        "",
        f"**{len(results)} files | {total_methods} methods | "
        f"{total_stubs} stubs | {total_translated} translated**",
        "",
        "| Stubs | Done | Methods | Python | Java | Unresolved |",
        "|------:|-----:|--------:|--------|------|--------:|",
    ]
    for r in results:
        py_short = r["python"].replace("engine/", "")
        java_raw = r["java"].replace("\\", "/")
        java_parts = java_raw.split("io/kestra/")
        java_short = java_parts[-1] if len(java_parts) > 1 else java_raw.split("/")[-1]
        unres = ", ".join(r["unresolved"][:3])
        if len(r["unresolved"]) > 3:
            unres += "..."
        lines.append(
            f"| {r['stubs']} | {r['completion']}% | {r['methods']} "
            f"| [{py_short}]({r['python']}) | {java_short} | {unres} |"
        )

    path = os.path.join(OUTPUT_DIR, "scaffold-work-report.md")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    return path


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    results = scan_scaffolds()

    json_path = write_json(results)
    html_path = write_html(results)
    md_path = write_markdown(results)

    total_stubs = sum(r["stubs"] for r in results)
    total_methods = sum(r["methods"] for r in results)
    total_translated = sum(r["translated"] for r in results)

    print(f"Scanned {len(results)} scaffold files")
    print(f"  Methods: {total_methods}  Stubs: {total_stubs}  Translated: {total_translated}")
    print(f"  JSON: {json_path}")
    print(f"  HTML: {html_path}")
    print(f"  MD:   {md_path}")
    print()
    print("Top 15 files needing most work:")
    for r in results[:15]:
        py = r["python"].replace("engine/", "")
        print(f"  {r['stubs']:3d} stubs | {r['completion']:3d}% | {py}")


if __name__ == "__main__":
    main()
