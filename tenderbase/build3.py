# -*- coding: utf-8 -*-
import os
from comp import *

OUT = os.path.dirname(os.path.abspath(__file__))
S = {}

def aibadge(t="AI"):
    return f'<span class="ai-badge">{icon("ai",12,2.2)}{t}</span>'

def cite(n):
    return f'<span class="cite">{n}</span>'

def disclaimer(text, pad=13):
    return (f'<div style="display:flex;gap:9px;align-items:flex-start;background:var(--bg);border-radius:12px;padding:{pad}px">'
            f'<span style="color:var(--ink-3);display:flex;flex:0 0 auto">{icon("info",15,2)}</span>'
            f'<div style="font-size:11.5px;color:var(--ink-2);line-height:17px">{text}</div></div>')

def feedback():
    return (f'<div style="display:flex;align-items:center;gap:8px">'
            f'<span style="font-size:11.5px;color:var(--ink-3)">Helpful?</span>'
            f'<span style="width:28px;height:28px;border-radius:8px;background:var(--bg);color:var(--ink-2);'
            f'display:flex;align-items:center;justify-content:center">{icon("thumbup",15,2)}</span>'
            f'<span style="width:28px;height:28px;border-radius:8px;background:var(--bg);color:var(--ink-2);'
            f'display:flex;align-items:center;justify-content:center">{icon("thumbdown",15,2)}</span></div>')

# ============ 21 — AI TENDER SUMMARY (on Tender Details) ============
def bullet(txt, c=None):
    ci = f' {cite(c)}' if c else ''
    return (f'<div style="display:flex;gap:9px;margin-top:9px">'
            f'<span style="width:5px;height:5px;border-radius:50%;background:var(--ai);flex:0 0 5px;margin-top:8px"></span>'
            f'<div style="font-size:13.5px;line-height:20px;color:var(--ink-2);flex:1">{txt}{ci}</div></div>')

S[21] = page("", f'''<div class="screen">{statusbar()}
<div class="tnav">
 <div class="iconbtn g">{icon("back",21)}</div>
 <div style="text-align:center"><div style="font-size:16px;font-weight:600;letter-spacing:-.02em">Tender Summary</div>
  <div style="font-size:11.5px;color:var(--ink-3)">ETH/IT/2026/091</div></div>
 <div class="iconbtn g">{icon("share",19)}</div></div>
<div style="flex:1;overflow:hidden;position:relative;padding:14px 20px 0">
 <div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:13px;margin-bottom:14px">
  <div style="font-size:14.5px;font-weight:600;letter-spacing:-.02em;line-height:20px">
   Supply and Delivery of Computer Equipment</div>
  <div style="display:flex;align-items:center;gap:7px;margin-top:6px">
   {badge("Open","open")}<span style="font-size:12px;color:var(--ink-2)">eThekwini Municipality</span></div>
 </div>

 <div class="ai-card" style="padding:15px;margin-bottom:14px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:11px">
   {aibadge("AI Summary")}
   <span style="font-size:11px;color:var(--ink-3)">From 4 tender documents</span></div>
  <div style="font-size:14px;line-height:21px;color:var(--ink)">
   This tender seeks a supplier to deliver <b>desktop computers, laptops and peripherals</b> to municipal
   offices across eThekwini over a <b>12-month period</b>.{cite(1)}</div>
  <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line)">
   <div class="lbl" style="margin-bottom:2px">Key points</div>
   {bullet("Estimated contract value of R2.4 million, delivered in phased batches.", 1)}
   {bullet("Compulsory briefing session held 4 September 2026 — attendance certificate required.", 3)}
   {bullet("Minimum B-BBEE Level 4; preference points allocated on the 80/20 scoring system.", 2)}
   {bullet("Delivery to 6 municipal sites within 30 days of purchase order.", 1)}
  </div>
  <div style="margin-top:12px;padding-top:11px;border-top:1px solid var(--line);display:flex;
   align-items:center;justify-content:space-between">
   {feedback()}
   <span style="display:flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:var(--ai)">
    {icon("copy",14,2)}Copy</span></div>
 </div>

 <div class="lbl" style="margin:0 2px 8px">Sources</div>
 <div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:2px 13px;margin-bottom:13px">
  <div style="display:flex;align-items:center;gap:11px;padding:11px 0;border-bottom:1px solid var(--line)">
   {cite(1)}<div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:500">Tender Specification Document</div>
   <div style="font-size:11px;color:var(--ink-3);margin-top:1px">Pages 3–7 · PDF</div></div>
   <span style="color:var(--ink-3)">{icon("chev",16,2)}</span></div>
  <div style="display:flex;align-items:center;gap:11px;padding:11px 0;border-bottom:1px solid var(--line)">
   {cite(2)}<div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:500">SBD Forms (1, 4, 6.1, 9)</div>
   <div style="font-size:11px;color:var(--ink-3);margin-top:1px">Page 2 · PDF</div></div>
   <span style="color:var(--ink-3)">{icon("chev",16,2)}</span></div>
  <div style="display:flex;align-items:center;gap:11px;padding:11px 0">
   {cite(3)}<div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:500">Addendum No. 1 — Briefing Minutes</div>
   <div style="font-size:11px;color:var(--ink-3);margin-top:1px">Page 1 · PDF</div></div>
   <span style="color:var(--ink-3)">{icon("chev",16,2)}</span></div>
 </div>

 {disclaimer("AI summaries are generated from the official tender documents and may contain errors. Always verify against the source documents before submitting a bid.")}
 <div class="fade"></div>
</div>
<div style="padding:12px 20px 10px;background:#fff;border-top:1px solid var(--line);display:flex;gap:10px">
 <div class="btn btn-s" style="flex:0 0 120px;gap:6px">{icon("doc",17,2)}Documents</div>
 <div class="btn btn-p" style="flex:1;gap:7px">{icon("ai",17,2)}Ask about this tender</div></div>
{homebar()}</div>''')

# ============ 22 — AI ASSISTANT (chat, grounded) ============
def userbubble(t):
    return (f'<div style="display:flex;justify-content:flex-end;margin-bottom:14px">'
            f'<div style="max-width:80%;background:var(--navy);color:#fff;border-radius:16px 16px 4px 16px;'
            f'padding:11px 14px;font-size:14px;line-height:20px">{t}</div></div>')

def aibubble(inner, sources=None):
    src = ""
    if sources:
        chips = "".join(f'<span style="display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 9px;'
                        f'border-radius:7px;background:var(--ai-bg);color:var(--ai);font-size:11.5px;font-weight:600">'
                        f'{icon("doc",12,2.2)}{s}</span>' for s in sources)
        src = (f'<div style="margin-top:11px;padding-top:10px;border-top:1px solid var(--line)">'
               f'<div style="font-size:10.5px;font-weight:700;letter-spacing:.06em;color:var(--ink-3);'
               f'margin-bottom:7px">SOURCES</div><div style="display:flex;flex-wrap:wrap;gap:6px">{chips}</div></div>')
    return (f'<div style="display:flex;gap:9px;margin-bottom:14px">'
            f'<div style="width:30px;height:30px;border-radius:9px;background:var(--ai-bg);color:var(--ai);'
            f'display:flex;align-items:center;justify-content:center;flex:0 0 30px">{icon("ai",16,2.1)}</div>'
            f'<div style="flex:1;min-width:0;background:#fff;border:1px solid var(--line);border-radius:4px 16px 16px 16px;'
            f'padding:13px">{inner}{src}</div></div>')

ans1 = f'''<div style="font-size:14px;line-height:21px;color:var(--ink)">
Yes — based on your company profile you meet <b>3 of 4</b> mandatory requirements:</div>
<div style="margin-top:10px">
 <div style="display:flex;gap:9px;align-items:flex-start;margin-top:8px">
  <span style="color:var(--green);display:flex;flex:0 0 auto">{icon("check2",16,2.2)}</span>
  <span style="font-size:13.5px;color:var(--ink-2);line-height:19px">Valid tax clearance (to 31 Mar 2027)</span></div>
 <div style="display:flex;gap:9px;align-items:flex-start;margin-top:8px">
  <span style="color:var(--green);display:flex;flex:0 0 auto">{icon("check2",16,2.2)}</span>
  <span style="font-size:13.5px;color:var(--ink-2);line-height:19px">B-BBEE Level 2 (Level 4 or better required)</span></div>
 <div style="display:flex;gap:9px;align-items:flex-start;margin-top:8px">
  <span style="color:var(--green);display:flex;flex:0 0 auto">{icon("check2",16,2.2)}</span>
  <span style="font-size:13.5px;color:var(--ink-2);line-height:19px">Active CSD registration</span></div>
 <div style="display:flex;gap:9px;align-items:flex-start;margin-top:8px">
  <span style="color:var(--amber);display:flex;flex:0 0 auto">{icon("warn",16,2.2)}</span>
  <span style="font-size:13.5px;color:var(--ink-2);line-height:19px">
   <b style="color:var(--ink)">Briefing attendance not confirmed</b> — the session on 4 Sep was compulsory.</span></div>
</div>'''

S[22] = page("", f'''<div class="screen">{statusbar()}
<div class="tnav">
 <div class="iconbtn g">{icon("back",21)}</div>
 <div style="text-align:center"><div style="font-size:16px;font-weight:600;letter-spacing:-.02em">TenderBase Assistant</div>
  <div style="font-size:11.5px;color:var(--ink-3)">Answers from your tenders</div></div>
 <div class="iconbtn g">{icon("refresh",19)}</div></div>
<div style="flex:1;overflow:hidden;position:relative;padding:14px 20px 0">
 <div style="display:flex;align-items:center;gap:9px;background:var(--ai-bg);border-radius:11px;padding:10px 12px;margin-bottom:16px">
  <span style="color:var(--ai);display:flex">{icon("doc",16,2)}</span>
  <span style="font-size:12px;color:var(--ai);font-weight:500;flex:1">Context: Supply and Delivery of Computer Equipment</span>
</div>
 {userbubble("Do we qualify for this tender?")}
 {aibubble(ans1, ["Specification p.4", "SBD 1 p.2", "Your company profile"])}
 {userbubble("What documents must we submit?")}
 {aibubble(f'''<div style="font-size:14px;line-height:21px;color:var(--ink)">
 The bid pack must contain <b>six</b> items:</div>
 <div style="margin-top:9px;font-size:13.5px;line-height:22px;color:var(--ink-2)">
 1. Completed SBD 1 (invitation to bid)<br>
 2. SBD 4 — declaration of interest<br>
 3. SBD 6.1 — preference points claim<br>
 4. Certified B-BBEE certificate<br>
 5. Priced Bill of Quantities<br>
 6. Compulsory briefing attendance certificate</div>''', ["SBD Forms p.1–3", "Specification p.7"])}
 <div class="fade"></div>
</div>
<div style="background:#fff;border-top:1px solid var(--line);padding:10px 20px">
 <div style="display:flex;gap:7px;margin-bottom:10px;overflow:hidden">
  {chip("Summarise requirements")}{chip("Key dates")}{chip("Who do I contact?")}</div>
 <div style="display:flex;gap:9px;align-items:center">
  <div class="field" style="flex:1;height:46px;border-radius:23px;padding:0 16px">
   <span class="ph" style="flex:1;font-size:14px">Ask about this tender...</span></div>
  <div style="width:46px;height:46px;border-radius:50%;background:var(--navy);color:#fff;display:flex;
   align-items:center;justify-content:center;flex:0 0 46px">{icon("send",19,2)}</div></div>
 <div style="font-size:10.5px;color:var(--ink-3);text-align:center;padding:8px 0 16px;line-height:15px">
  Answers may be inaccurate. Verify before bidding.</div>
</div>{homebar()}</div>''')

# ============ 23 — AI MATCH SCORE / WHY THIS TENDER ============
def scorebar(label, pct, tone="green", note=""):
    col = {"green":"var(--green)","amber":"var(--amber)","red":"var(--red)","blue":"var(--blue)"}[tone]
    return (f'<div style="margin-top:13px">'
            f'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">'
            f'<span style="font-size:13px;font-weight:500;color:var(--ink)">{label}</span>'
            f'<span style="font-size:12px;font-weight:600;color:{col}">{note}</span></div>'
            f'<div style="height:6px;border-radius:3px;background:#EDF1F6;overflow:hidden">'
            f'<div style="width:{pct}%;height:100%;background:{col};border-radius:3px"></div></div></div>')

S[23] = page("", f'''<div class="screen">{statusbar()}
<div class="tnav">
 <div class="iconbtn g">{icon("back",21)}</div>
 <div style="font-size:16.5px;font-weight:600;letter-spacing:-.02em">Why this tender?</div>
 <div class="iconbtn g">{icon("bookmark",19)}</div></div>
<div style="flex:1;overflow:hidden;position:relative;padding:14px 20px 0">
 <div class="ai-card" style="padding:16px;margin-bottom:14px">
  <div style="display:flex;align-items:center;gap:14px">
   <svg width="76" height="76" viewBox="0 0 80 80">
    <circle cx="40" cy="40" r="33" stroke="#EDF1F6" stroke-width="8" fill="none"/>
    <circle cx="40" cy="40" r="33" stroke="#12805C" stroke-width="8" fill="none" stroke-linecap="round"
     stroke-dasharray="207.3" stroke-dashoffset="43.5" transform="rotate(-90 40 40)"/>
    <text x="40" y="43" text-anchor="middle" font-family="Inter" font-size="21" font-weight="700"
     fill="#1B2430" letter-spacing="-1">79</text>
    <text x="40" y="55" text-anchor="middle" font-family="Inter" font-size="9" font-weight="600" fill="#7C8798">MATCH</text>
   </svg>
   <div style="flex:1;min-width:0">
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">{aibadge("AI Match")}</div>
    <div style="font-size:15px;font-weight:600;letter-spacing:-.02em;line-height:20px">Strong match for your profile</div>
    <div style="font-size:12.5px;color:var(--ink-2);line-height:18px;margin-top:4px">
     Based on your categories, province, past saves and company compliance.</div>
   </div>
  </div>
 </div>

 <div style="background:#fff;border:1px solid var(--line);border-radius:16px;padding:15px;margin-bottom:14px">
  <div style="font-size:15px;font-weight:600;letter-spacing:-.02em">Score breakdown</div>
  {scorebar("Category — IT &amp; Technology", 100, "green", "Exact match")}
  {scorebar("Province — KwaZulu-Natal", 100, "green", "Exact match")}
  {scorebar("Value in your range", 88, "green", "R2.4M")}
  {scorebar("Compliance readiness", 75, "amber", "3 of 4")}
  {scorebar("Time to prepare bid", 45, "amber", "10 days")}
 </div>

 <div style="background:#fff;border:1px solid var(--line);border-radius:16px;padding:15px;margin-bottom:14px">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
   <span style="color:var(--amber);display:flex">{icon("warn",17,2)}</span>
   <div style="font-size:15px;font-weight:600;letter-spacing:-.02em">Before you bid</div></div>
  <div style="font-size:13px;color:var(--ink-2);line-height:20px;margin-top:8px">
   The compulsory briefing was held on <b style="color:var(--ink)">4 September 2026</b>. Confirm your attendance
   certificate is on file, otherwise the bid may be disqualified.{cite(3)}</div>
  <div style="font-size:13px;color:var(--ink-2);line-height:20px;margin-top:9px">
   Adding your <b style="color:var(--ink)">CIDB grading</b> to your company profile would improve matching on
   construction-adjacent tenders.</div>
 </div>

 {disclaimer("Match scores are a guide generated from your profile and tender data. They are not a guarantee of eligibility or award.")}
 <div class="fade"></div>
</div>
<div style="padding:12px 20px 10px;background:#fff;border-top:1px solid var(--line);display:flex;gap:10px">
 <div class="btn btn-s" style="flex:0 0 118px;gap:6px">{icon("bell",17,2)}Set Alert</div>
 <div class="btn btn-p" style="flex:1">View Full Tender</div></div>
{homebar()}</div>''')

# ============ 24 — AI SEARCH (natural language) ============
def nlresult(t):
    return f'''<div class="card" style="margin-bottom:11px">
<div style="display:flex;gap:10px;align-items:flex-start">
 <div style="flex:1;min-width:0">
  <div style="display:flex;gap:6px;margin-bottom:8px">
   <span style="display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 8px;border-radius:6px;
    background:var(--green-bg);color:var(--green);font-size:11px;font-weight:700">{t["score"]}% match</span>
   {badge(t["cat"],"cat")}</div>
  <div class="tc-title">{t["title"]}</div>
  <div class="tc-org">{icon("build",14,1.9)}{t["org"]}</div>
 </div>{bookmark(False)}</div>
<div style="display:flex;gap:9px;align-items:flex-start;background:var(--ai-bg);border-radius:10px;padding:9px 11px;margin-top:11px">
 <span style="color:var(--ai);display:flex;flex:0 0 auto;margin-top:1px">{icon("ai",13,2.2)}</span>
 <div style="font-size:12px;color:var(--ai);line-height:17px">{t["why"]}</div></div>
<div class="tc-foot">
 <div style="display:flex;align-items:center;gap:9px"><span class="val">{t["value"]}</span>
  {deadline(t["days"], t["tone"])}</div>
 <div style="display:flex;align-items:center;gap:3px;font-size:13px;font-weight:600;color:var(--blue)">View{icon("chev",15,2.2)}</div>
</div></div>'''

S[24] = page("", f'''<div class="screen">{statusbar()}
<div style="background:#fff;padding:6px 20px 14px;border-bottom:1px solid var(--line)">
 <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
  <h2 style="font-size:23px">Find tenders</h2>
  <div class="iconbtn g">{icon("cog",20)}</div></div>
 <div class="field" style="height:auto;min-height:54px;align-items:flex-start;padding:13px 14px;
  border-color:var(--ai-line);box-shadow:0 0 0 3px rgba(74,85,184,.07)">
  <span style="color:var(--ai);display:flex;flex:0 0 auto">{icon("ai",19,2)}</span>
  <span class="val" style="flex:1;font-weight:500;line-height:20px">IT tenders in KZN closing after 15 September under R5 million</span></div>
 <div style="display:flex;align-items:center;gap:7px;margin-top:11px">
  {aibadge("Smart Search")}
  <span style="font-size:11.5px;color:var(--ink-3)">Interpreted as filters — tap to edit</span></div>
 <div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:10px">
  {chip("IT &amp; Technology",True,"outline")}{chip("KwaZulu-Natal",True,"outline")}
  {chip("Closes after 15 Sep",True,"outline")}{chip("Under R5M",True,"outline")}</div>
</div>
<div style="flex:1;overflow:hidden;position:relative;padding:14px 20px 0">
 <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
  <div style="font-size:13px;color:var(--ink-2)"><b style="color:var(--ink);font-weight:700">12</b> tenders matched</div>
  <div style="display:flex;gap:6px;align-items:center;font-size:12px;font-weight:600;color:var(--blue)">
   {icon("sort",14,2)}Best match</div></div>

 {nlresult(dict(score=94, cat="IT &amp; Technology", title="Supply and Delivery of Computer Equipment",
   org="eThekwini Municipality", value="R2.4M", days="10 days left", tone="soon",
   why="Matches your IT category and KZN province, closes 12 Sep and sits well inside your value range."))}
 {nlresult(dict(score=88, cat="IT &amp; Technology", title="Network Infrastructure Upgrade: Regional Offices",
   org="KZN Department of Education", value="R4.1M", days="24 days left", tone="mute",
   why="Similar to two tenders you saved previously; closes after 15 September as requested."))}
 {nlresult(dict(score=81, cat="IT &amp; Technology", title="Software Licensing and Support Services",
   org="Msunduzi Local Municipality", value="R1.6M", days="19 days left", tone="mute",
   why="Within your value range and province, though licensing differs from your usual supply work."))}
 <div class="fade"></div>
</div>
{bottomnav("Search")}</div>''')

# ============ 25 — AI WEEKLY BRIEFING ============
def brief(ico, tone, title, body, action=None):
    col = {"blue":("var(--blue-soft)","var(--blue)"),"amber":("var(--amber-bg)","var(--amber)"),
           "green":("var(--green-bg)","var(--green)"),"ai":("var(--ai-bg)","var(--ai)")}[tone]
    a = (f'<div style="display:flex;align-items:center;gap:4px;font-size:12.5px;font-weight:600;color:var(--blue);'
         f'margin-top:9px">{action}{icon("chev",14,2.3)}</div>') if action else ""
    return (f'<div style="display:flex;gap:12px;padding:13px 0;border-bottom:1px solid var(--line)">'
            f'<div style="width:34px;height:34px;border-radius:10px;background:{col[0]};color:{col[1]};display:flex;'
            f'align-items:center;justify-content:center;flex:0 0 34px">{icon(ico,17,2)}</div>'
            f'<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600;letter-spacing:-.015em">{title}</div>'
            f'<div style="font-size:12.5px;color:var(--ink-2);line-height:19px;margin-top:3px">{body}</div>{a}</div></div>')

S[25] = page("", f'''<div class="screen">{statusbar()}
<div class="tnav">
 <div class="iconbtn g">{icon("back",21)}</div>
 <div style="font-size:16.5px;font-weight:600;letter-spacing:-.02em">Weekly Briefing</div>
 <div class="iconbtn g">{icon("share",19)}</div></div>
<div style="flex:1;overflow:hidden;position:relative;padding:14px 20px 0">
 <div class="ai-card" style="padding:16px;margin-bottom:14px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
   {aibadge("AI Briefing")}
   <span style="font-size:11px;color:var(--ink-3)">Mon 31 Aug – Sun 6 Sep</span></div>
  <div style="font-size:14.5px;line-height:22px;color:var(--ink)">
   <b>18 new tenders</b> matched your profile this week — up from 11 last week, driven mainly by
   municipal IT procurement in KwaZulu-Natal.</div>
  <div style="display:flex;gap:9px;margin-top:14px">
   <div style="flex:1;background:var(--bg);border-radius:11px;padding:10px">
    <div style="font-size:19px;font-weight:700;letter-spacing:-.04em;line-height:1">18</div>
    <div style="font-size:11px;color:var(--ink-3);margin-top:3px">New matches</div></div>
   <div style="flex:1;background:var(--bg);border-radius:11px;padding:10px">
    <div style="font-size:19px;font-weight:700;letter-spacing:-.04em;line-height:1;color:var(--amber)">4</div>
    <div style="font-size:11px;color:var(--ink-3);margin-top:3px">Closing next week</div></div>
   <div style="flex:1;background:var(--bg);border-radius:11px;padding:10px">
    <div style="font-size:19px;font-weight:700;letter-spacing:-.04em;line-height:1">R31M</div>
    <div style="font-size:11px;color:var(--ink-3);margin-top:3px">Combined value</div></div>
  </div>
 </div>

 <div style="background:#fff;border:1px solid var(--line);border-radius:16px;padding:2px 15px;margin-bottom:14px">
  {brief("target","ai","Your strongest match this week",
    "Supply and Delivery of Computer Equipment (eThekwini Municipality) scored 94% — closing 12 September.",
    "Open tender")}
  {brief("clock","amber","Act soon",
    "Provision of Security Services closes in 2 days and is still on your saved list.", "Review saved")}
  {brief("trend","blue","Category trend",
    "IT &amp; Technology tenders in KZN rose 38% this week. Cleaning contracts stayed flat.", "See all IT tenders")}
  {brief("build","green","New organisation for you",
    "KZN Department of Education published its first tender matching your profile.", "View organisation")}
 </div>

 <div style="background:#fff;border:1px solid var(--line);border-radius:16px;padding:15px;margin-bottom:14px">
  <div style="font-size:14.5px;font-weight:600;letter-spacing:-.02em;margin-bottom:3px">Suggested next step</div>
  <div style="font-size:13px;color:var(--ink-2);line-height:20px">
   Add your <b style="color:var(--ink)">CIDB grading</b> to unlock an estimated 6 additional matches per week
   in Construction and Engineering.</div>
  <div class="btn btn-s sm" style="margin-top:12px">Complete company profile</div>
 </div>

 {disclaimer("Briefings are generated weekly from tenders published on TenderBase and your saved activity.")}
 <div class="fade"></div>
</div>
{bottomnav("Home")}</div>''')

# ============ 26 — AI SETTINGS & TRANSPARENCY ============
S[26] = page("", f'''<div class="screen">{statusbar()}
<div class="tnav">
 <div class="iconbtn g">{icon("back",21)}</div>
 <div style="font-size:16.5px;font-weight:600;letter-spacing:-.02em">AI Features</div>
 <div style="width:38px"></div></div>
<div style="flex:1;overflow:hidden;position:relative;padding:14px 20px 0">
 <div class="ai-card" style="padding:15px;margin-bottom:16px;display:flex;gap:13px;align-items:center">
  <div style="width:40px;height:40px;border-radius:12px;background:var(--ai-bg);color:var(--ai);display:flex;
   align-items:center;justify-content:center;flex:0 0 40px">{icon("ai",20,2.1)}</div>
  <div style="flex:1"><div style="font-size:14.5px;font-weight:600;letter-spacing:-.015em">AI features enabled</div>
   <div style="font-size:12px;color:var(--ink-2);margin-top:2px;line-height:17px">Summaries, match scores and smart search</div></div>
  {toggle(True)}
 </div>

 {group("Features",
   listrow("quote","Tender Summaries","Summarise tender documents on open", right="on", tone="blue")+
   listrow("target","Match Scores","Show why a tender fits your profile", right="on", tone="green")+
   listrow("search","Smart Search","Understand plain-language searches", right="on", tone="blue")+
   listrow("list","Weekly Briefing","Delivered Mondays at 07:00", right="on", tone="amber")+
   listrow("ai","Tender Assistant","Ask questions about a tender", right="on", last=True))}

 {group("Data used",
   listrow("doc","Tender documents","Official documents published with each tender", right='<span style="font-size:12px;color:var(--green);font-weight:600">Always</span>')+
   listrow("build","Your company profile","Compliance data used to score matches", right="on")+
   listrow("bookmark","Your saved tenders","Improves recommendation quality", right="on")+
   listrow("search","Your search history","Improves smart search results", right="off", last=True),
   note="TenderBase does not use your data to train third-party AI models.")}

 {group("Accuracy",
   listrow("shieldc","Show sources on every answer","Cannot be disabled", right='<span style="display:inline-flex;align-items:center;height:21px;padding:0 8px;border-radius:6px;background:var(--bg);color:var(--ink-3);font-size:11px;font-weight:700">LOCKED</span>', tone="green")+
   listrow("thumbup","Send feedback on AI answers","Helps us improve accuracy", right="on", last=True))}

 <div style="background:var(--amber-bg);border-radius:14px;padding:13px;display:flex;gap:11px;align-items:flex-start;margin-bottom:14px">
  <span style="color:var(--amber);display:flex;flex:0 0 auto">{icon("warn",18,2)}</span>
  <div style="font-size:12.5px;color:#8A5200;line-height:18px">
   AI output is a research aid, not legal or procurement advice. TenderBase is not responsible for bid decisions
   made on AI-generated summaries.</div>
 </div>
 <div style="text-align:center;font-size:13px;font-weight:600;color:var(--blue);padding-bottom:14px">
  How TenderBase AI works</div>
 <div class="fade"></div>
</div>
{homebar()}</div>''')

for k, v in S.items():
    open(os.path.join(OUT, f"s{k}.html"), "w").write(v)
print("wrote", sorted(S))
