# -*- coding: utf-8 -*-
"""TenderBase shared design-system components -> HTML"""

def svg(d, s=22, sw=1.75, extra=""):
    return (f'<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" {extra}>'
            f'<g class="ic" style="stroke-width:{sw}">{d}</g></svg>')

I = {
 "home": '<path d="M3 10.2 12 3.5l9 6.7V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
 "search": '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
 "bookmark": '<path d="M6 4.5h12a1 1 0 0 1 1 1V21l-7-4-7 4V5.5a1 1 0 0 1 1-1z"/>',
 "bell": '<path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5"/><path d="M13.7 19a2 2 0 0 1-3.4 0"/>',
 "user": '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.2a7.7 7.7 0 0 1 15 0"/>',
 "back": '<path d="M15 19l-7-7 7-7"/>',
 "share": '<path d="M12 3v13"/><path d="m7.5 7.5 4.5-4.5 4.5 4.5"/><path d="M5 14v5.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V14"/>',
 "chev": '<path d="m9 5 7 7-7 7"/>',
 "chevd": '<path d="m5 9 7 7 7-7"/>',
 "cal": '<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
 "pin": '<path d="M20 10.5c0 5.5-8 12-8 12s-8-6.5-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10.3" r="2.9"/>',
 "build": '<path d="M4 21V8.5L12 4l8 4.5V21"/><path d="M9.5 21v-6h5v6"/>',
 "filter": '<path d="M4 6h16M7 12h10M10 18h4"/>',
 "sort": '<path d="M7 4v16m0 0-3.2-3.4M7 20l3.2-3.4"/><path d="M17 20V4m0 0-3.2 3.4M17 4l3.2 3.4"/>',
 "check": '<path d="m5 12.5 4.5 4.5L19 7"/>',
 "clock": '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.2V12l3.2 2"/>',
 "doc": '<path d="M13.5 3H7a1.8 1.8 0 0 0-1.8 1.8v14.4A1.8 1.8 0 0 0 7 21h10a1.8 1.8 0 0 0 1.8-1.8V8.3z"/><path d="M13.4 3v5.3h5.4"/>',
 "trend": '<path d="M3.5 16.5 9 11l3.5 3.5L20.5 6.5"/><path d="M15.5 6.5h5v5"/>',
 "spark": '<path d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.4l-1.9-5.6L4.5 11 10.1 9z"/>',
 "mail": '<rect x="3" y="5" width="18" height="14" rx="2.4"/><path d="m3.6 6.6 8.4 6 8.4-6"/>',
 "lock": '<rect x="4.5" y="10" width="15" height="10.5" rx="2.4"/><path d="M8 10V7.6a4 4 0 0 1 8 0V10"/>',
 "eye": '<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.9"/>',
 "rand": '<path d="M12 3.2 3.5 7.5v5.2c0 4.6 3.5 7.9 8.5 9.1 5-1.2 8.5-4.5 8.5-9.1V7.5z"/>',
 "money": '<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.3a3 3 0 0 0-4.9 1.2M9.5 14.7a3 3 0 0 0 4.9-1.2M12 7.5v9"/>',
 "plus": '<path d="M12 5v14M5 12h14"/>',
 "cog": '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7h-.3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1v-.3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1.1z"/>',
 "phone": '<path d="M21 16.4v2.6a2 2 0 0 1-2.2 2 19.6 19.6 0 0 1-8.5-3 19.3 19.3 0 0 1-6-6 19.6 19.6 0 0 1-3-8.6A2 2 0 0 1 3.3 1.4H6a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.4 2.1l-1.1 1.1a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.9.4 1.9.6 2.9.8a2 2 0 0 1 1.7 2z" transform="translate(0,2)"/>',
 "refresh": '<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"/><path d="M20.8 4.5v5h-5"/>',
 "wifi": '<path d="M2 8.8a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16.2a5 5 0 0 1 6 0"/><circle cx="12" cy="19.6" r="1" fill="currentColor"/>',
 "flag": '<path d="M5 21V4.5h13l-2.5 4 2.5 4H5"/>',
 "info": '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.2M12 7.9v.1"/>',
 "star": '<path d="m12 3.8 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 10l5.9-.9z"/>',
}


I["truck"] = '<path d="M2.5 6.5h11v10h-11z"/><path d="M13.5 10h4l3 3v3.5h-7z"/><circle cx="7" cy="18.5" r="2"/><circle cx="17" cy="18.5" r="2"/>'
I["heart"] = '<path d="M12 20s-7.5-4.6-7.5-9.5A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.9C19.5 15.4 12 20 12 20z"/>'
I["case"] = '<rect x="3" y="7.5" width="18" height="12.5" rx="2.4"/><path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5M3 12.5h18"/>'
I["mega"] = '<path d="M4 9.5v5a2 2 0 0 0 2 2h2l8 4.5V3L8 7.5H6a2 2 0 0 0-2 2z"/><path d="M19 9.5a4 4 0 0 1 0 5"/>'
I["leaf"] = '<path d="M20 4c0 9-5.5 14-11.5 14A4.5 4.5 0 0 1 4 13.5C4 7.5 11 4 20 4z"/><path d="M14 10 5 19"/>'
I["spray"] = '<rect x="7" y="9" width="9" height="12" rx="2.4"/><path d="M10 9V5.5h4V9M18 5h2M18 8.5h2M18 12h2"/>'
I["wrench"] = '<path d="M20 6.5a5 5 0 0 1-6.6 6.6L6 20.5 3.5 18l7.4-7.4A5 5 0 0 1 17.5 4z"/>'


I["download"] = '<path d="M12 3.5v11.5"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4.5 19.5h15"/>'
I["logout"] = '<path d="M15 4.5h3.5A1.5 1.5 0 0 1 20 6v12a1.5 1.5 0 0 1-1.5 1.5H15"/><path d="M10 16.5 14.5 12 10 7.5"/><path d="M14.5 12H3.5"/>'
I["card"] = '<rect x="2.5" y="5" width="19" height="14" rx="2.6"/><path d="M2.5 9.5h19"/><path d="M6 14.5h3.5"/>'
I["help"] = '<circle cx="12" cy="12" r="8.5"/><path d="M9.7 9.6a2.4 2.4 0 0 1 4.6.8c0 1.6-2.3 2.1-2.3 3.4"/><path d="M12 16.8v.1"/>'
I["edit"] = '<path d="M4 20h4L19 9a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5z"/><path d="M14.5 6.5 17.5 9.5"/>'
I["check2"] = '<circle cx="12" cy="12" r="8.5"/><path d="m8.4 12.2 2.5 2.5 4.7-5"/>'
I["globe"] = '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5a14 14 0 0 1 0 17a14 14 0 0 1 0-17z"/>'
I["shieldc"] = '<path d="M12 3.2 4.5 6.3v5.5c0 4.6 3.2 7.8 7.5 8.9 4.3-1.1 7.5-4.3 7.5-8.9V6.3z"/><path d="m9 12.2 2.2 2.2L15.2 10"/>'
I["pdf"] = '<path d="M13.5 3H7a1.8 1.8 0 0 0-1.8 1.8v14.4A1.8 1.8 0 0 0 7 21h10a1.8 1.8 0 0 0 1.8-1.8V8.3z"/><path d="M13.4 3v5.3h5.4"/><path d="M8.5 16.5h7"/>'
I["arrowup"] = '<path d="M12 19.5V5"/><path d="m6.5 10.5 5.5-5.5 5.5 5.5"/>'
I["toggle"] = '<rect x="2.5" y="7" width="19" height="10" rx="5"/><circle cx="16.5" cy="12" r="3"/>'
I["users"] = '<circle cx="9" cy="8.5" r="3.3"/><path d="M2.8 19.5a6.4 6.4 0 0 1 12.4 0"/><path d="M16.5 6a3.3 3.3 0 0 1 0 6.4"/><path d="M17.5 13.8a6.4 6.4 0 0 1 3.7 5.7"/>'
I["trash"] = '<path d="M4.5 6.5h15"/><path d="M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5"/><path d="M6.5 6.5 7.4 20a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-13.5"/>'
I["bookmarks"] = '<path d="M8 3.5h11a1 1 0 0 1 1 1v13l-6.5-3.7L7 17.5v-13a1 1 0 0 1 1-1z"/><path d="M4 7v13.5"/>'
I["sliders"] = '<path d="M4 8h10M18 8h2M4 16h4M12 16h8"/><circle cx="16" cy="8" r="2.2"/><circle cx="10" cy="16" r="2.2"/>'
I["crown"] = '<path d="M3.5 8.5 7 13l5-7.5 5 7.5 3.5-4.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19z"/>'


I["ai"] = '<path d="M12 3.2 13.7 8.3 18.8 10 13.7 11.7 12 16.8 10.3 11.7 5.2 10 10.3 8.3z"/><path d="M18.5 15.5 19.3 17.7 21.5 18.5 19.3 19.3 18.5 21.5 17.7 19.3 15.5 18.5 17.7 17.7z"/>'
I["send"] = '<path d="M20.5 3.5 10.5 13.5"/><path d="M20.5 3.5 14.2 20.5 10.5 13.5 3.5 9.8z"/>'
I["quote"] = '<path d="M6 5.5h12"/><path d="M6 10.5h12"/><path d="M6 15.5h7"/>'
I["target"] = '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'
I["thumbup"] = '<path d="M7 10.5 11 3.5a2.2 2.2 0 0 1 2.2 2.2V9.5h4.6a2 2 0 0 1 2 2.4l-1.3 6a2 2 0 0 1-2 1.6H7z"/><rect x="3" y="10.5" width="4" height="9" rx="1.2"/>'
I["thumbdown"] = '<path d="M17 13.5 13 20.5a2.2 2.2 0 0 1-2.2-2.2V14.5H6.2a2 2 0 0 1-2-2.4l1.3-6a2 2 0 0 1 2-1.6H17z"/><rect x="17" y="4.5" width="4" height="9" rx="1.2"/>'
I["copy"] = '<rect x="8.5" y="8.5" width="12" height="12" rx="2.4"/><path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7a2.5 2.5 0 0 0 2.5 2.5h2.5"/>'
I["warn"] = '<path d="M12 4.2 21 19.5H3z"/><path d="M12 10v4.2M12 17.2v.1"/>'
I["list"] = '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.5" cy="6.5" r="1.3" fill="currentColor"/><circle cx="4.5" cy="12" r="1.3" fill="currentColor"/><circle cx="4.5" cy="17.5" r="1.3" fill="currentColor"/>'

def icon(n, s=22, sw=1.75, extra=""):
    return svg(I[n], s, sw, extra)

# ---------- chrome ----------
def statusbar(dark=False, time="9:41"):
    c = "#fff" if dark else "#1B2430"
    bat = (f'<svg width="26" height="13" viewBox="0 0 26 13" fill="none">'
           f'<rect x="0.6" y="0.6" width="21" height="11.8" rx="3.2" stroke="{c}" stroke-opacity=".4"/>'
           f'<rect x="2.2" y="2.2" width="17" height="8.6" rx="2" fill="{c}"/>'
           f'<path d="M23.5 4.4c1.2.3 1.9 1.3 1.9 2.2s-.7 1.9-1.9 2.2z" fill="{c}" fill-opacity=".5"/></svg>')
    sig = (f'<svg width="18" height="13" viewBox="0 0 18 13" fill="{c}">'
           f'<rect x="0" y="8.5" width="3" height="4.5" rx="1"/><rect x="4.8" y="6" width="3" height="7" rx="1"/>'
           f'<rect x="9.6" y="3.2" width="3" height="9.8" rx="1"/><rect x="14.4" y="0" width="3" height="13" rx="1"/></svg>')
    wf = (f'<svg width="17" height="13" viewBox="0 0 24 24" fill="none"><g stroke="{c}" stroke-width="2" '
          f'stroke-linecap="round" fill="none">{I["wifi"]}</g></svg>')
    return (f'<div class="sbar{" dark" if dark else ""}"><div>{time}</div>'
            f'<div class="rt">{sig}{wf}{bat}</div></div>')

def homebar(dark=False):
    return f'<div class="hbar{" dark" if dark else ""}"><i></i></div>'

def logo(size=34, light=False, name=True, tag=False):
    navy = "#FFFFFF" if light else "#0F2A47"
    accent = "#4E92D6" if light else "#2E6BA8"
    fg = "#0F2A47" if light else "#FFFFFF"
    mark = (f'<svg width="{size}" height="{size}" viewBox="0 0 40 40" fill="none">'
            f'<rect width="40" height="40" rx="11.5" fill="{navy}"/>'
            f'<path d="M11.5 11.5h17" stroke="{fg}" stroke-width="3.1" stroke-linecap="round"/>'
            f'<path d="M20 11.5v12.2" stroke="{fg}" stroke-width="3.1" stroke-linecap="round"/>'
            f'<path d="M11 29h18" stroke="{accent}" stroke-width="3.1" stroke-linecap="round"/>'
            f'<circle cx="20" cy="23.8" r="0" fill="{accent}"/></svg>')
    if not name: return mark
    fs = size*0.62
    txt = (f'<div style="font-size:{fs:.0f}px;font-weight:700;letter-spacing:-0.045em;'
           f'color:{"#fff" if light else "#0F2A47"}">Tender<span style="font-weight:500;'
           f'color:{"#9DB8D4" if light else "#5A6B80"}">Base</span></div>')
    return f'<div class="logo-w" style="gap:{size*0.28:.0f}px">{mark}{txt}</div>'

NAV = [("home","Home"),("search","Search"),("bookmark","Saved"),("bell","Alerts"),("user","Profile")]
def bottomnav(active="Home", badge=3):
    out = []
    for k, lab in NAV:
        on = " on" if lab == active else ""
        b = f'<div class="bdg">{badge}</div>' if (lab=="Alerts" and badge and lab!=active) else ""
        fill = ' fill="rgba(15,42,71,.10)"' if on else ""
        out.append(f'<div class="it{on}">{b}{icon(k,23,2.0 if on else 1.7,extra=fill)}<span>{lab}</span></div>')
    return f'<div class="bnav">{"".join(out)}</div><div class="hbar"><i></i></div>'

def topnav(title="", left="back", right="", sub=""):
    r = right or ""
    t = (f'<div style="text-align:center"><div style="font-size:16px;font-weight:600;letter-spacing:-.02em">{title}</div>'
         + (f'<div style="font-size:11.5px;color:var(--ink-3)">{sub}</div>' if sub else "") + '</div>')
    l = f'<div class="iconbtn g">{icon(left,21)}</div>' if left else '<div style="width:38px"></div>'
    return f'<div class="tnav">{l}{t}{r or "<div style=\'width:38px\'></div>"}</div>'

# ---------- atoms ----------
def badge(text, kind="open", ico=None):
    cls = {"open":"b-open","soon":"b-soon","urg":"b-urg","cat":"b-cat"}[kind]
    d = '<span class="dot"></span>' if kind in ("open",) else ""
    ic = icon(ico,12,2.2) if ico else ""
    return f'<span class="badge {cls}">{d}{ic}{text}</span>'

def chip(text, on=False, style="solid", ico=None):
    c = "chip"
    if on: c += " on" if style=="solid" else " outline-on"
    ic = icon(ico,15,2) if ico else ""
    ck = icon("check",14,2.6) if (on and style!="solid") else ""
    return f'<div class="{c}">{ic}{text}{ck}</div>'

def bookmark(on=False):
    fill = ' fill="currentColor"' if on else ""
    return f'<div class="bm{" on" if on else ""}">{icon("bookmark",18,1.9,extra=fill)}</div>'

def stat(label, value, ico, tone="navy"):
    col = {"navy":("var(--blue-soft)","var(--blue)"),
           "amber":("var(--amber-bg)","var(--amber)"),
           "green":("var(--green-bg)","var(--green)")}[tone]
    return (f'<div style="flex:1;background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 11px;box-shadow:var(--sh-sm)">'
            f'<div style="width:30px;height:30px;border-radius:9px;background:{col[0]};color:{col[1]};display:flex;'
            f'align-items:center;justify-content:center;margin-bottom:9px">{icon(ico,17,2)}</div>'
            f'<div style="font-size:23px;font-weight:700;letter-spacing:-.045em;line-height:1">{value}</div>'
            f'<div style="font-size:11.5px;color:var(--ink-3);font-weight:500;margin-top:4px">{label}</div></div>')

def deadline(text, tone="soon"):
    col = {"open":("var(--green-bg)","var(--green)"),"soon":("var(--amber-bg)","var(--amber)"),
           "urg":("var(--red-bg)","var(--red)"),"mute":("var(--bg)","var(--ink-2)")}[tone]
    return (f'<span style="display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:7px;'
            f'background:{col[0]};color:{col[1]};font-size:11.5px;font-weight:600">{icon("clock",13,2.1)}{text}</span>')


def matchbadge(pct, compact=False):
    """AI match score pill — indigo signals AI-derived, never a status colour."""
    fs = "10.5px" if compact else "11px"
    h = "20px" if compact else "22px"
    return (f'<span style="display:inline-flex;align-items:center;gap:4px;height:{h};padding:0 7px;border-radius:6px;'
            f'background:var(--ai-bg);color:var(--ai);font-size:{fs};font-weight:700;letter-spacing:.01em">'
            f'{icon("ai",11,2.3)}{pct}%</span>')

def aiaction(label, small=False):
    """Secondary AI entry-point button."""
    h = "34px" if small else "40px"
    fs = "12.5px" if small else "14px"
    return (f'<div style="display:inline-flex;align-items:center;justify-content:center;gap:6px;height:{h};'
            f'padding:0 13px;border-radius:10px;background:var(--ai-bg);color:var(--ai);'
            f'font-size:{fs};font-weight:600">{icon("ai",15,2.2)}{label}</div>')

def tendercard(t):
    """full TenderCard"""
    st = t.get("status","open")
    stmap = {"open":("Open","open"),"soon":("Closing Soon","soon"),"urg":("Urgent","urg")}
    lbl, kind = stmap[st]
    num = (f'<div style="font-size:11px;color:var(--ink-3);font-weight:500;font-feature-settings:\'tnum\';'
           f'margin-top:8px;letter-spacing:0">{t["num"]}</div>') if t.get("num") else ""
    return f'''<div class="card" style="margin-bottom:12px">
<div style="display:flex;gap:10px;align-items:flex-start">
 <div style="flex:1;min-width:0">
  <div style="display:flex;gap:6px;margin-bottom:8px">{badge(lbl,kind)}{badge(t["cat"],"cat")}{matchbadge(t["match"]) if t.get("match") else ""}</div>
  <div class="tc-title">{t["title"]}</div>
  <div class="tc-org">{icon("build",14,1.9)}{t["org"]}</div>
 </div>{bookmark(t.get("saved",False))}</div>
<div style="display:flex;gap:14px;margin-top:10px">
 <div class="meta">{icon("pin",14,1.9)}{t["loc"]}</div>
 <div class="meta">{icon("cal",14,1.9)}{t["close"]}</div>
</div>{num}
<div class="tc-foot">
 <div style="display:flex;align-items:center;gap:9px"><span class="val">{t["value"]}</span>{deadline(t["days"], t.get("tone","mute"))}</div>
 <div style="display:flex;align-items:center;gap:3px;font-size:13px;font-weight:600;color:var(--blue)">View{icon("chev",15,2.2)}</div>
</div></div>'''

def compactcard(t):
    tone = t.get("tone","soon")
    bar = {"soon":"var(--amber)","urg":"var(--red)","open":"var(--green)"}[tone]
    return f'''<div class="card" style="padding:0;margin-bottom:10px;display:flex;overflow:hidden">
<div style="width:4px;background:{bar};flex:0 0 4px"></div>
<div style="padding:12px 13px;flex:1;min-width:0">
 <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
  <div style="flex:1;min-width:0">
   <div style="font-size:14.5px;font-weight:600;line-height:19px;letter-spacing:-.015em">{t["title"]}</div>
   {'<div style="margin-top:6px">'+matchbadge(t["match"],True)+'</div>' if t.get("match") else ""}
   <div style="font-size:12px;color:var(--ink-2);margin-top:3px">{t["org"]}</div>
  </div>
  <div style="text-align:right;flex:0 0 auto"><div class="val" style="font-size:14px">{t["value"]}</div></div>
 </div>
 <div style="display:flex;align-items:center;justify-content:space-between;margin-top:9px">
  {deadline(t["days"], tone)}
  <div style="font-size:11.5px;color:var(--ink-3);font-weight:500">{t["close"]}</div>
 </div>
</div></div>'''

def notif(t):
    tone = t["tone"]
    col = {"new":("var(--blue-soft)","var(--blue)"),"soon":("var(--amber-bg)","var(--amber)"),
           "upd":("var(--green-bg)","var(--green)"),"mute":("var(--bg)","var(--ink-3)")}[tone]
    unread = t.get("unread",False)
    bg = "#fff" if unread else "transparent"
    bd = "1px solid var(--line)" if unread else "1px solid transparent"
    dot = ('<span style="width:8px;height:8px;border-radius:50%;background:var(--blue);flex:0 0 8px;margin-top:6px"></span>'
           if unread else '<span style="width:8px;flex:0 0 8px"></span>')
    return f'''<div style="display:flex;gap:10px;padding:10px 12px;border-radius:14px;background:{bg};border:{bd};
 box-shadow:{"var(--sh-sm)" if unread else "none"};margin-bottom:6px;align-items:flex-start">
<div style="width:34px;height:34px;border-radius:10px;background:{col[0]};color:{col[1]};display:flex;
 align-items:center;justify-content:center;flex:0 0 34px">{icon(t["ico"],17,2)}</div>
<div style="flex:1;min-width:0">
 <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">
  <div style="font-size:14px;font-weight:{600 if unread else 500};letter-spacing:-.015em">{t["title"]}</div>
  <div style="font-size:11px;color:var(--ink-3);white-space:nowrap">{t["time"]}</div>
 </div>
 <div style="font-size:12.5px;color:var(--ink-2);line-height:18px;margin-top:2px">{t["desc"]}</div>
</div>{dot}</div>'''

def searchbar(ph="Search tenders...", right=None):
    r = right or ""
    return f'<div class="search">{icon("search",19,2,extra="")}<div class="ph" style="flex:1">{ph}</div>{r}</div>'

def sectionhead(title, action=None):
    a = f'<a>{action}</a>' if action else ""
    return f'<div class="sec"><h3>{title}</h3>{a}</div>'

def page(css_extra, inner, dark=False):
    return f'''<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="ds.css"><style>{css_extra}</style></head>
<body>{inner}</body></html>'''

# ---------- data ----------
T_COMP = dict(title="Supply and Delivery of Computer Equipment", org="eThekwini Municipality",
  cat="IT &amp; Technology", loc="KwaZulu-Natal", close="12 Sep 2026", value="R2.4M",
  days="10 days left", tone="soon", status="open", num="ETH/IT/2026/091", saved=False)
T_SEC = dict(title="Provision of Security Services", org="KZN Department of Public Works",
  cat="Security", loc="Durban, KwaZulu-Natal", close="18 Sep 2026", value="R8.7M",
  days="16 days left", tone="mute", status="open", num="ZNQ-2026-08421", saved=False)


# ---------- extra shared components ----------
def toggle(on=True):
    if on:
        return ('<span style="width:46px;height:27px;border-radius:14px;background:var(--navy);position:relative;flex:0 0 46px;display:block">'
                '<span style="position:absolute;top:3px;right:3px;width:21px;height:21px;border-radius:50%;background:#fff;'
                'box-shadow:0 1px 3px rgba(0,0,0,.2)"></span></span>')
    return ('<span style="width:46px;height:27px;border-radius:14px;background:#D8DEE7;position:relative;flex:0 0 46px;display:block">'
            '<span style="position:absolute;top:3px;left:3px;width:21px;height:21px;border-radius:50%;background:#fff;'
            'box-shadow:0 1px 3px rgba(0,0,0,.2)"></span></span>')

def listrow(ico, title, sub="", right="chev", tone="navy", last=False):
    col = {"navy":("var(--bg)","var(--navy)"),"blue":("var(--blue-soft)","var(--blue)"),
           "green":("var(--green-bg)","var(--green)"),"amber":("var(--amber-bg)","var(--amber)"),
           "red":("var(--red-bg)","var(--red)")}[tone]
    s2 = f'<div style="font-size:12px;color:var(--ink-3);margin-top:2px;line-height:16px">{sub}</div>' if sub else ""
    if right == "chev":
        r = f'<span style="color:var(--ink-3)">{icon("chev",17,2)}</span>'
    elif right in ("on","off"):
        r = toggle(right == "on")
    else:
        r = right
    bd = "" if last else "border-bottom:1px solid var(--line);"
    ic = (f'<div style="width:34px;height:34px;border-radius:10px;background:{col[0]};color:{col[1]};display:flex;'
          f'align-items:center;justify-content:center;flex:0 0 34px">{icon(ico,17,2)}</div>') if ico else ""
    return (f'<div style="display:flex;align-items:center;gap:12px;padding:10px 0;{bd}">{ic}'
            f'<div style="flex:1;min-width:0"><div style="font-size:14.5px;font-weight:500;letter-spacing:-.015em;'
            f'color:var(--ink)">{title}</div>{s2}</div>{r}</div>')

def group(title, rows, note=""):
    h = f'<div class="lbl" style="margin:0 2px 7px">{title}</div>' if title else ""
    n = f'<div style="font-size:11.5px;color:var(--ink-3);margin:7px 4px 0;line-height:16px">{note}</div>' if note else ""
    return (f'<div style="margin-bottom:13px">{h}<div style="background:#fff;border:1px solid var(--line);'
            f'border-radius:14px;padding:2px 14px">{rows}</div>{n}</div>')
