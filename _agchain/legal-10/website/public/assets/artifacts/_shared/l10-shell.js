function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = String(value);
    else node.setAttribute(key, String(value));
  }
  for (const child of children) node.appendChild(child);
  return node;
}

function linkItem(item) {
  return el(
    "a",
    { class: "l10-link", href: item.href, text: item.title },
    []
  );
}

async function loadNav() {
  const res = await fetch("./_shared/nav.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load nav.json: ${res.status}`);
  return res.json();
}

function buildShell(nav) {
  const page = document.getElementById("l10-page");
  if (!page) {
    throw new Error('Missing required element: <main id="l10-page">...</main>');
  }

  document.body.dataset.l10Artifact = "true";

  const brand = el("a", { class: "l10-brand", href: nav.brand?.href || "/" }, [
    el("span", { text: nav.brand?.title || "LegalChain" }),
    el("span", { class: "l10-pill", text: "artifact" }),
  ]);

  const topnav = el("nav", { class: "l10-topnav", "aria-label": "Top navigation" });
  for (const item of nav.top || []) topnav.appendChild(linkItem(item));

  const topbar = el("header", { class: "l10-topbar" }, [
    el("div", { class: "l10-topbar-inner" }, [brand, topnav]),
  ]);

  const sidenav = el("aside", { class: "l10-sidenav" });
  sidenav.appendChild(el("div", { class: "l10-sidenav-title", text: "Artifacts" }));
  for (const item of nav.side || []) sidenav.appendChild(linkItem(item));

  const content = el("section", { class: "l10-content" });
  content.appendChild(page);

  const layout = el("div", { class: "l10-layout" }, [sidenav, content]);

  const shell = el("div", { class: "l10-shell", "data-l10-shell-version": "1" }, [
    topbar,
    layout,
  ]);

  document.body.prepend(shell);
}

async function main() {
  try {
    const nav = await loadNav();
    buildShell(nav);
  } catch (err) {
    // Fail loudly but keep page content visible for debugging.
    // (If #l10-page exists, it's still in the DOM.)
    console.error(err);
    const banner = document.createElement("div");
    banner.style.cssText =
      "padding:10px 12px; background:#fee2e2; color:#7f1d1d; font:14px/1.4 ui-sans-serif, system-ui; border-bottom:1px solid #fecaca;";
    banner.textContent = `L10 artifact shell failed to load: ${String(err?.message || err)}`;
    document.body.prepend(banner);
  }
}

main();
