#!/usr/bin/env python3
# Converte le parti statiche dei disegni (Claude Design) in JSX per src/Benvenuto.jsx.
# Uso: python3 -I tools/disegni2jsx.py <cartella design_login> <template orbita> <file jsx di uscita> <file css di uscita>
import re, sys, json
from html.parser import HTMLParser

VOID = {"img", "br", "hr", "input", "meta", "link", "path", "circle", "rect", "line", "polyline", "polygon", "ellipse", "stop"}
ATTR_MAP = {"class": "className", "sc-camel-view-box": "viewBox", "sc-camel-path-length": "pathLength", "for": "htmlFor",
            "sc-camel-on-click": None, "href": None}

class Node:
    def __init__(self, tag, attrs):
        self.tag, self.attrs, self.kids = tag, attrs, []

class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("#root", [])
        self.stack = [self.root]
    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs)
        self.stack[-1].kids.append(n)
        if tag not in VOID:
            self.stack.append(n)
    def handle_startendtag(self, tag, attrs):
        self.stack[-1].kids.append(Node(tag, attrs))
    def handle_endtag(self, tag):
        if tag in VOID:
            return
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                return
    def handle_data(self, d):
        self.stack[-1].kids.append(d)

def camel(k):
    return re.sub(r"-([a-z])", lambda m: m.group(1).upper(), k)

def style_obj(s):
    out = []
    for part in s.split(";"):
        if ":" not in part:
            continue
        k, v = part.split(":", 1)
        k, v = k.strip(), v.strip()
        if not k:
            continue
        out.append(f"{camel(k)}: {json.dumps(v)}")
    return "{ " + ", ".join(out) + " }"

def attr_jsx(k, v):
    if k in ATTR_MAP:
        k2 = ATTR_MAP[k]
        if k2 is None:
            return ""
        k = k2
    elif k == "style":
        return f"style={{{style_obj(v or '')}}}"
    elif not (k.startswith("aria-") or k.startswith("data-") or k == "role"):
        k = camel(k)
    if v is None:
        return f"{k}"
    return f"{k}={json.dumps(v)}"

def emit(n, ind=""):
    if isinstance(n, str):
        t = n.strip()
        if not t:
            return ""
        t = re.sub(r"\s+", " ", t)
        return ind + "{" + json.dumps(t) + "}\n"
    attrs = " ".join(a for a in (attr_jsx(k, v) for k, v in n.attrs) if a)
    head = f"<{n.tag}" + (" " + attrs if attrs else "")
    kids = [k for k in n.kids if not (isinstance(k, str) and not k.strip())]
    if not kids:
        return ind + head + " />\n"
    body = "".join(emit(k, ind + "  ") for k in kids)
    return ind + head + ">\n" + body + ind + f"</{n.tag}>\n"

def parse(html):
    p = P()
    p.feed(html)
    return p.root

def find(n, pred):
    if isinstance(n, str):
        return None
    if pred(n):
        return n
    for k in n.kids:
        r = find(k, pred)
        if r:
            return r
    return None

def els(n):
    return [k for k in n.kids if not isinstance(k, str)]

def text_of(n):
    if isinstance(n, str):
        return n
    return "".join(text_of(k) for k in n.kids)

def keyframes(html):
    styles = re.findall(r"<style>(.*?)</style>", html, re.S)
    css = "\n".join(styles)
    return re.findall(r"@keyframes\s+([a-z0-9-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}", css)

def rename(html, names, prefix):
    for nm in sorted(set(names), key=len, reverse=True):
        html = re.sub(r"(?<![a-z0-9-])" + nm + r"(?![a-z0-9-])", prefix + nm, html)
    return html

def main():
    dl, orbit_path, out_jsx, out_css = sys.argv[1:5]
    order = ["p01", "p02", "p03", "p04", "p05", "p06"]
    css_parts, art, meta = [], [], []
    for i, pdir in enumerate(order, 1):
        html = open(f"{dl}/{pdir}/_template.html", encoding="utf8").read()
        kfs = keyframes(html)
        names = [n for n, _ in kfs]
        pref = f"wt{i}-"
        html = rename(html, names, pref)
        for n, body in keyframes(html):
            css_parts.append(f"@keyframes {n}{{{body}}}")
        body = html.split("</helmet>", 1)[1].split("</x-dc>", 1)[0]
        root = parse(body)
        page = els(root)[0]
        kids = els(page)
        visual = kids[1]
        h1 = find(page, lambda n: n.tag == "h1")
        p = find(page, lambda n: n.tag == "p" and "margin: 10px" in dict(n.attrs).get("style", ""))
        art.append(emit(visual, "    "))
        meta.append({"title": text_of(h1).strip(), "text": text_of(p).strip()})
    dhtml = open(f"{dl}/p07/_template.html", encoding="utf8").read()
    kfs = keyframes(dhtml)
    dhtml = rename(dhtml, [n for n, _ in kfs], "wt7-")
    for n, body in keyframes(dhtml):
        css_parts.append(f"@keyframes {n}{{{body}}}")
    dbody = dhtml.split("</helmet>", 1)[1].split("</x-dc>", 1)[0]
    dvis = els(els(parse(dbody))[0])[1]
    door = emit(dvis, "  ")
    door = re.sub(r'src="[0-9a-f-]{36}"', "src={logo}", door)
    ohtml = open(orbit_path, encoding="utf8").read()
    kfs = keyframes(ohtml)
    ohtml = rename(ohtml, [n for n, _ in kfs], "wto-")
    for n, body in keyframes(ohtml):
        css_parts.append(f"@keyframes {n}{{{body}}}")
    obody = ohtml.split("</helmet>", 1)[1].split("</x-dc>", 1)[0]
    oroot = parse(obody)
    ovis = els(els(oroot)[0])[0]
    with open(out_jsx, "w", encoding="utf8") as f:
        f.write("// GENERATO da tools/disegni2jsx.py dai disegni di Claude Design (Accesso e Registrazione, Icone F1 in orbita).\nimport React from \"react\";\n\n")
        f.write("export const SLIDE_TEXT = " + json.dumps(meta, ensure_ascii=False, indent=2) + ";\n\n")
        f.write("export const SLIDE_ART = [\n")
        for a in art:
            f.write("  () => (\n" + a + "  ),\n")
        f.write("];\n\n")
        f.write("export const DoorArt = ({ logo }) => (\n" + door + ");\n\n")
        f.write("export const OrbitArt = () => (\n" + emit(ovis, "  ") + ");\n")
    with open(out_css, "w", encoding="utf8") as f:
        f.write("/* GENERATO da tools/disegni2jsx.py: animazioni delle schede di benvenuto e dell'orbita. */\n")
        f.write("\n".join(css_parts) + "\n")
    print("ok", len(art), "slides,", len(css_parts), "keyframes")

main()
