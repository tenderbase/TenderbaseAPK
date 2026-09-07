# -*- coding: utf-8 -*-
import os
from comp import *

OUT = os.path.dirname(os.path.abspath(__file__))
S = {}

# ============ 11 PROFILE ============
def profstat(v, l):
    return (f'<div style="flex:1;text-align:center"><div style="font-size:19px;font-weight:700;letter-spacing:-.04em;color:var(--ink)">{v}</div>'
            f'<div style="font-size:11px;color:var(--ink-3);margin-top:2px">{l}</div></div>')

S[11] = page("", f'''<div class="screen">{statusbar()}
<div style="background:#fff;padding:6px 20px 13px;border-bottom:1px solid var(--line)">
 <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:13px">
  <h2 style="font-size:23px">Profile</h2>
  <div class="iconbtn g">{icon("cog",20)}</div></div>
 <div style="display:flex;align-items:center;gap:14px">
  <div style="width:54px;height:54px;border-radius:16px;background:var(--navy);color:#fff;display:flex;
   align-items:center;justify-content:center;font-size:19px;font-weight:600;letter-spacing:0;flex:0 0 54px">SM</div>
  <div style="flex:1;min-width:0">
   <div style="font-size:18px;font-weight:700;letter-spacing:-.03em">Sipho Mkhize</div>
   <div style="font-size:13px;color:var(--ink-2);margin-top:2px">sipho@mkhize-solutions.co.za</div>
   <div style="display:flex;gap:6px;margin-top:7px">{badge("Professional Plan","cat")}</div>
  </div>
  <div class="iconbtn g">{icon("edit",19)}</div>
 </div>
 <div style="display:flex;background:var(--bg);border-radius:13px;padding:10px 0;margin-top:13px">
  {profstat("17","Saved")}
  <div style="width:1px;background:var(--line)"></div>
  {profstat("5","Categories")}
  <div style="width:1px;background:var(--line)"></div>
  {profstat("3","Saved searches")}
 </div>
</div>
<div style="flex:1;overflow:hidden;position:relative;padding:13px 20px 0">
 {group("Account", 
   listrow("build","Company Profile","Mkhize Solutions (Pty) Ltd")+
   listrow("sliders","Tender Preferences","5 categories · 2 provinces")+
   listrow("bookmarks","Saved Searches","3 active")+
   listrow("crown","Subscription &amp; Billing","Professional · Renews 28 Sep", last=True))}
 {group("Notifications",
   listrow("bell","Notification Settings","Push, email and deadline alerts")+
   listrow("mail","Email Digest","Daily at 07:00", last=True))}
 {group("Support",
   listrow("help","Help Centre")+
   listrow("shieldc","Privacy &amp; Security")+
   listrow("info","About TenderBase", right='<span style="font-size:12.5px;color:var(--ink-3)">v1.4.2</span>', last=True))}
 <div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:2px 14px">
  {listrow("logout","Sign Out", right="", tone="red", last=True)}
 </div>
 <div class="fade"></div>
</div>
{bottomnav("Profile")}</div>''')

# ============ 12 COMPANY PROFILE ============
def kvrow(k, v, last=False):
    bd = "" if last else "border-bottom:1px solid var(--line);"
    return (f'<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;{bd}">'
            f'<span style="font-size:13.5px;color:var(--ink-2)">{k}</span>'
            f'<span style="font-size:13.5px;font-weight:600;color:var(--ink);text-align:right;max-width:60%">{v}</span></div>')

S[12] = page("", f'''<div class="screen">{statusbar()}
<div class="tnav">
 <div class="iconbtn g">{icon("back",21)}</div>
 <div style="font-size:16.5px;font-weight:600;letter-spacing:-.02em">Company Profile</div>
 <div style="font-size:14px;font-weight:600;color:var(--blue)">Edit</div></div>
<div style="flex:1;overflow:hidden;position:relative;padding:16px 20px 0">
 <div style="background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px;box-shadow:var(--sh);margin-bottom:16px">
  <div style="display:flex;align-items:center;gap:13px">
   <div style="width:52px;height:52px;border-radius:15px;background:var(--blue-soft);color:var(--navy);display:flex;
    align-items:center;justify-content:center;flex:0 0 52px">{icon("build",25,1.9)}</div>
   <div style="flex:1;min-width:0">
    <div style="font-size:16.5px;font-weight:700;letter-spacing:-.025em;line-height:21px">Mkhize Solutions (Pty) Ltd</div>
    <div style="font-size:12.5px;color:var(--ink-2);margin-top:3px">Durban, KwaZulu-Natal</div></div>
  </div>
  <div style="display:flex;align-items:center;gap:8px;margin-top:14px;padding-top:13px;border-top:1px solid var(--line)">
   <span style="color:var(--green);display:flex">{icon("check2",17,2)}</span>
   <span style="font-size:12.5px;color:var(--ink-2);flex:1">Profile 80% complete — add CIDB grading</span>
  </div>
  <div style="height:5px;border-radius:3px;background:#EDF1F6;margin-top:10px;overflow:hidden">
   <div style="width:80%;height:100%;background:var(--green);border-radius:3px"></div></div>
 </div>

 {group("Registration details",
   kvrow("Registration No.","2018/443921/07")+
   kvrow("VAT Number","4820318877")+
   kvrow("CSD Number","MAAA0891234")+
   kvrow("Tax Clearance", '<span style="color:var(--green)">Valid to 31 Mar 2027</span>', last=True))}

 {group("Compliance",
   kvrow("B-BBEE Level","Level 2")+
   kvrow("CIDB Grading", '<span style="color:var(--amber)">Not provided</span>')+
   kvrow("Company Type","Private Company (Pty) Ltd", last=True))}

 {group("Contact",
   kvrow("Contact Person","Sipho Mkhize")+
   kvrow("Phone","+27 31 502 8841")+
   kvrow("Email","info@mkhize-solutions.co.za", last=True))}

 <div style="background:var(--blue-soft);border-radius:14px;padding:13px;display:flex;gap:11px;align-items:flex-start">
  <span style="color:var(--blue);display:flex;flex:0 0 auto">{icon("info",18,2)}</span>
  <div style="font-size:12.5px;color:var(--navy);line-height:18px">
   A complete company profile improves the accuracy of your recommended tenders.</div>
 </div>
 <div class="fade"></div>
</div>
<div style="padding:12px 20px 10px;background:#fff;border-top:1px solid var(--line)">
 <div class="btn btn-p">Save Changes</div></div>
{homebar()}</div>''')

# ============ 13 TENDER PREFERENCES ============
prefchips = "".join([chip("Construction",True,"outline"), chip("IT &amp; Technology",True,"outline"),
                     chip("Security",True,"outline"), chip("Professional Services",True,"outline"),
                     chip("Supply &amp; Delivery",True,"outline"), chip("+ Add category")])
provchips = "".join([chip("KwaZulu-Natal",True,"outline"), chip("Gauteng",True,"outline"), chip("+ Add province")])

S[13] = page("", f'''<div class="screen">{statusbar()}
<div class="tnav">
 <div class="iconbtn g">{icon("back",21)}</div>
 <div style="font-size:16.5px;font-weight:600;letter-spacing:-.02em">Tender Preferences</div>
 <div style="width:38px"></div></div>
<div style="flex:1;overflow:hidden;position:relative;padding:16px 20px 0">
 <div style="font-size:13px;color:var(--ink-2);line-height:19px;margin-bottom:16px">
  These preferences shape your dashboard feed, recommendations and alerts.</div>

 <div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:14px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:11px">
   <div style="font-size:15px;font-weight:600;letter-spacing:-.015em">Categories</div>
   <span style="font-size:12px;color:var(--ink-3)">5 selected</span></div>
  <div style="display:flex;flex-wrap:wrap;gap:8px">{prefchips}</div>
 </div>

 <div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:14px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:11px">
   <div style="font-size:15px;font-weight:600;letter-spacing:-.015em">Provinces</div>
   <span style="font-size:12px;color:var(--ink-3)">2 selected</span></div>
  <div style="display:flex;flex-wrap:wrap;gap:8px">{provchips}</div>
 </div>

 <div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:14px">
  <div style="font-size:15px;font-weight:600;letter-spacing:-.015em;margin-bottom:4px">Tender value range</div>
  <div style="font-size:12px;color:var(--ink-3);margin-bottom:14px">Only show tenders within this range</div>
  <div style="display:flex;justify-content:space-between;margin-bottom:13px">
   <div><div style="font-size:10.5px;color:var(--ink-3);font-weight:600;letter-spacing:.06em">MIN</div>
    <div style="font-size:15px;font-weight:700;color:var(--navy)">R250 000</div></div>
   <div style="text-align:right"><div style="font-size:10.5px;color:var(--ink-3);font-weight:600;letter-spacing:.06em">MAX</div>
    <div style="font-size:15px;font-weight:700;color:var(--navy)">R20M+</div></div></div>
  <div style="position:relative;height:6px;background:#E6EAF0;border-radius:3px;margin:0 11px">
   <div style="position:absolute;left:8%;right:8%;top:0;bottom:0;background:var(--navy);border-radius:3px"></div>
   <div style="position:absolute;left:8%;top:-8px;margin-left:-11px;width:22px;height:22px;border-radius:50%;background:#fff;border:2.5px solid var(--navy);box-shadow:0 2px 6px rgba(15,42,71,.25)"></div>
   <div style="position:absolute;right:8%;top:-8px;margin-right:-11px;width:22px;height:22px;border-radius:50%;background:#fff;border:2.5px solid var(--navy);box-shadow:0 2px 6px rgba(15,42,71,.25)"></div>
  </div>
 </div>

 {group("Matching",
   listrow("shieldc","Only show tenders I qualify for","Based on B-BBEE and CIDB grading", right="off")+
   listrow("globe","Include national tenders","Tenders open to all provinces", right="on")+
   listrow("case","Include private-sector tenders", right="on", last=True))}
 <div class="fade"></div>
</div>
<div style="padding:12px 20px 10px;background:#fff;border-top:1px solid var(--line)">
 <div class="btn btn-p">Save Preferences</div></div>
{homebar()}</div>''')

# ============ 14 NOTIFICATION SETTINGS ============
S[14] = page("", f'''<div class="screen">{statusbar()}
<div class="tnav">
 <div class="iconbtn g">{icon("back",21)}</div>
 <div style="font-size:16.5px;font-weight:600;letter-spacing:-.02em">Notification Settings</div>
 <div style="width:38px"></div></div>
<div style="flex:1;overflow:hidden;position:relative;padding:16px 20px 0">
 <div style="background:var(--navy);border-radius:16px;padding:15px;margin-bottom:18px;display:flex;gap:13px;
  align-items:center;box-shadow:0 8px 20px rgba(15,42,71,.18)">
  <div style="width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.12);color:#fff;display:flex;
   align-items:center;justify-content:center;flex:0 0 40px">{icon("bell",20,2)}</div>
  <div style="flex:1"><div style="font-size:14.5px;font-weight:600;color:#fff">Push notifications on</div>
   <div style="font-size:12px;color:#9DB8D4;margin-top:2px">TenderBase is monitoring 5 categories</div></div>
  {toggle(True)}
 </div>

 {group("Tender alerts",
   listrow("spark","New matching tenders","Sent as soon as a tender is published", right="on", tone="blue")+
   listrow("clock","Deadline reminders","7, 3 and 1 day before closing", right="on", tone="amber")+
   listrow("doc","Saved tender updates","Documents, addenda and date changes", right="on", tone="green")+
   listrow("flag","Tender closed","When a saved tender closes", right="off", last=True))}

 {group("Delivery channels",
   listrow("bell","Push notifications", right="on")+
   listrow("mail","Email","sipho@mkhize-solutions.co.za", right="on")+
   listrow("phone","SMS","Professional plan only", right="off", last=True))}

 {group("Email digest",
   listrow("cal","Daily digest","Every weekday at 07:00", right="on")+
   listrow("trend","Weekly summary","Mondays at 08:00", right="off", last=True),
   note="Digests summarise new tenders matching your preferences.")}

 {group("Quiet hours",
   listrow("clock","Pause notifications","22:00 – 06:00", right="on", last=True),
   note="Deadline reminders marked urgent will still be delivered.")}
 <div class="fade"></div>
</div>
{homebar()}</div>''')

# ============ 15 SUBSCRIPTION ============
def plan(name, price, per, feats, current=False, best=False):
    if current:
        head = (f'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">'
                f'<div style="font-size:17px;font-weight:700;letter-spacing:-.03em;color:#fff">{name}</div>'
                f'<span style="background:rgba(255,255,255,.15);color:#fff;font-size:10.5px;font-weight:700;'
                f'letter-spacing:.05em;border-radius:6px;padding:3px 8px">CURRENT PLAN</span></div>')
        f = "".join(f'<div style="display:flex;align-items:center;gap:9px;margin-top:8px"><span style="color:#6FD8AC;display:flex">{icon("check",15,2.6)}</span><span style="font-size:13px;color:#D5E2F0">{x}</span></div>' for x in feats)
        return (f'<div style="background:var(--navy);border-radius:16px;padding:16px;box-shadow:0 8px 22px rgba(15,42,71,.22);margin-bottom:12px">'
                f'{head}<div style="display:flex;align-items:baseline;gap:5px;margin-top:6px">'
                f'<span style="font-size:27px;font-weight:700;color:#fff;letter-spacing:-.04em">{price}</span>'
                f'<span style="font-size:13px;color:#9DB8D4">{per}</span></div>'
                f'<div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.12)">{f}</div></div>')
    tag = ('<span style="background:var(--blue-soft);color:var(--blue);font-size:10.5px;font-weight:700;letter-spacing:.05em;'
           'border-radius:6px;padding:3px 8px">RECOMMENDED</span>') if best else ""
    f = "".join(f'<div style="display:flex;align-items:center;gap:9px;margin-top:8px"><span style="color:var(--green);display:flex">{icon("check",15,2.6)}</span><span style="font-size:13px;color:var(--ink-2)">{x}</span></div>' for x in feats)
    return (f'<div style="background:#fff;border:1.5px solid {"#C3D7EC" if best else "var(--line)"};border-radius:16px;padding:16px;margin-bottom:12px">'
            f'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">'
            f'<div style="font-size:17px;font-weight:700;letter-spacing:-.03em">{name}</div>{tag}</div>'
            f'<div style="display:flex;align-items:baseline;gap:5px;margin-top:6px">'
            f'<span style="font-size:27px;font-weight:700;color:var(--navy);letter-spacing:-.04em">{price}</span>'
            f'<span style="font-size:13px;color:var(--ink-3)">{per}</span></div>'
            f'<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line)">{f}</div>'
            f'<div class="btn btn-s sm" style="margin-top:13px">Upgrade to {name}</div></div>')

S[15] = page("", f'''<div class="screen">{statusbar()}
<div class="tnav">
 <div class="iconbtn g">{icon("back",21)}</div>
 <div style="font-size:16.5px;font-weight:600;letter-spacing:-.02em">Subscription</div>
 <div style="width:38px"></div></div>
<div style="flex:1;overflow:hidden;position:relative;padding:16px 20px 0">
 {plan("Professional","R499","/ month",
   ["Unlimited tender searches","Saved searches and alerts","Full tender documents","3 team members"], current=True)}

 <div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:2px 14px;margin-bottom:18px">
  {kvrow("Billing cycle","Monthly")}
  {kvrow("Next payment","28 September 2026")}
  {kvrow("Payment method",'Visa •••• 4218')}
  {kvrow("Amount","R499.00", last=True)}
 </div>

 <div class="lbl" style="margin:0 2px 10px">Other plans</div>
 {plan("Enterprise","R1 299","/ month",
   ["Everything in Professional","Unlimited team members","API access","Priority support"], best=True)}
 {plan("Starter","R199","/ month",
   ["50 tender searches per month","5 saved tenders","Email alerts only"])}

 <div style="display:flex;gap:9px;margin-bottom:14px">
  <div class="btn btn-s sm" style="flex:1;gap:7px">{icon("card",17,2)}Manage payment</div>
  <div class="btn btn-s sm" style="flex:1;gap:7px">{icon("doc",17,2)}Invoices</div>
 </div>
 <div style="text-align:center;font-size:13px;color:var(--ink-3);font-weight:500;padding-bottom:10px">Cancel subscription</div>
 <div class="fade"></div>
</div>
{homebar()}</div>''')

# ============ 16 BILLING HISTORY ============
def invoice(no, date, amt, status="Paid", last=False):
    bd = "" if last else "border-bottom:1px solid var(--line);"
    col = ("var(--green-bg)","var(--green)") if status=="Paid" else ("var(--amber-bg)","var(--amber)")
    return (f'<div style="display:flex;align-items:center;gap:12px;padding:12px 0;{bd}">'
            f'<div style="width:34px;height:34px;border-radius:10px;background:var(--bg);color:var(--navy);display:flex;'
            f'align-items:center;justify-content:center;flex:0 0 34px">{icon("pdf",17,2)}</div>'
            f'<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600;letter-spacing:-.015em">{no}</div>'
            f'<div style="font-size:12px;color:var(--ink-3);margin-top:2px">{date}</div></div>'
            f'<div style="text-align:right"><div style="font-size:14px;font-weight:700;color:var(--ink)">{amt}</div>'
            f'<span style="display:inline-flex;align-items:center;height:19px;padding:0 7px;border-radius:5px;'
            f'background:{col[0]};color:{col[1]};font-size:10.5px;font-weight:700;margin-top:3px">{status}</span></div>'
            f'<span style="color:var(--ink-3);margin-left:4px;display:flex">{icon("download",17,2)}</span></div>')

S[16] = page("", f'''<div class="screen">{statusbar()}
<div class="tnav">
 <div class="iconbtn g">{icon("back",21)}</div>
 <div style="font-size:16.5px;font-weight:600;letter-spacing:-.02em">Billing &amp; Invoices</div>
 <div style="width:38px"></div></div>
<div style="flex:1;overflow:hidden;position:relative;padding:16px 20px 0">
 <div style="background:#fff;border:1px solid var(--line);border-radius:16px;padding:15px;box-shadow:var(--sh);margin-bottom:18px">
  <div style="display:flex;align-items:center;gap:13px">
   <div style="width:44px;height:30px;border-radius:7px;background:var(--navy);display:flex;align-items:center;
    justify-content:center;flex:0 0 44px;color:#fff;font-size:11px;font-weight:700;letter-spacing:.02em">VISA</div>
   <div style="flex:1"><div style="font-size:14.5px;font-weight:600;letter-spacing:-.015em">Visa •••• 4218</div>
    <div style="font-size:12px;color:var(--ink-3);margin-top:2px">Expires 08 / 2028</div></div>
   <div style="font-size:13px;font-weight:600;color:var(--blue)">Change</div>
  </div>
  <div style="display:flex;align-items:center;gap:9px;margin-top:13px;padding-top:12px;border-top:1px solid var(--line)">
   <span style="color:var(--ink-3);display:flex">{icon("cal",16,2)}</span>
   <span style="font-size:12.5px;color:var(--ink-2);flex:1">Next charge <b style="color:var(--ink)">R499.00</b> on 28 Sep 2026</span>
  </div>
 </div>

 <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
  <div class="lbl">Invoice history</div>
  <div style="font-size:12.5px;font-weight:600;color:var(--blue);display:flex;align-items:center;gap:5px">
   {icon("download",15,2)}Download all</div></div>
 <div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:2px 14px;margin-bottom:16px">
  {invoice("INV-2026-0842","28 Aug 2026","R499.00")}
  {invoice("INV-2026-0761","28 Jul 2026","R499.00")}
  {invoice("INV-2026-0688","28 Jun 2026","R499.00")}
  {invoice("INV-2026-0604","28 May 2026","R499.00")}
  {invoice("INV-2026-0521","28 Apr 2026","R199.00", last=True)}
 </div>

 {group("Billing details",
   kvrow("Billed to","Mkhize Solutions (Pty) Ltd")+
   kvrow("VAT Number","4820318877")+
   kvrow("Billing email","accounts@mkhize-solutions.co.za", last=True))}
 <div class="fade"></div>
</div>
{homebar()}</div>''')

# ============ 17 SAVED SEARCHES ============
def savedsearch(name, query, filters, count, alert=True, last=False):
    a = (f'<span style="display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:6px;'
         f'background:var(--green-bg);color:var(--green);font-size:11px;font-weight:600">{icon("bell",12,2.2)}Alerts on</span>'
         if alert else
         f'<span style="display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:6px;'
         f'background:var(--bg);color:var(--ink-3);font-size:11px;font-weight:600">{icon("bell",12,2.2)}Alerts off</span>')
    return f'''<div class="card" style="margin-bottom:12px">
<div style="display:flex;align-items:flex-start;gap:10px">
 <div style="flex:1;min-width:0">
  <div style="font-size:15.5px;font-weight:600;letter-spacing:-.02em">{name}</div>
  <div style="display:flex;align-items:center;gap:6px;margin-top:5px;font-size:12.5px;color:var(--ink-2)">
   {icon("search",14,2)}<span>"{query}"</span></div>
 </div>
 <div class="bm">{icon("edit",17,1.9)}</div></div>
<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">{filters}</div>
<div class="tc-foot">
 <div style="display:flex;align-items:center;gap:9px">
  <span style="font-size:13px;font-weight:600;color:var(--navy)">{count} results</span>{a}</div>
 <div style="display:flex;align-items:center;gap:3px;font-size:13px;font-weight:600;color:var(--blue)">Run{icon("chev",15,2.2)}</div>
</div></div>'''

def minichip(t):
    return (f'<span style="display:inline-flex;align-items:center;height:24px;padding:0 9px;border-radius:6px;'
            f'background:var(--bg);color:var(--ink-2);font-size:11.5px;font-weight:500">{t}</span>')

S[17] = page("", f'''<div class="screen">{statusbar()}
<div style="background:#fff;padding:8px 20px 14px;border-bottom:1px solid var(--line)">
 <div style="display:flex;align-items:flex-start;justify-content:space-between">
  <div><h2 style="font-size:23px">Saved Searches</h2>
   <div class="sub" style="font-size:13px;margin-top:4px">Re-run a search or get alerted on new matches.</div></div>
  <div class="iconbtn" style="background:var(--navy);color:#fff">{icon("plus",21,2.2)}</div></div>
</div>
<div style="flex:1;overflow:hidden;position:relative;padding:16px 20px 0">
 {savedsearch("IT tenders in KZN","computer equipment",
   minichip("IT &amp; Technology")+minichip("KwaZulu-Natal")+minichip("Open"), 24)}
 {savedsearch("High-value security contracts","security services",
   minichip("Security")+minichip("R5M+")+minichip("2 provinces"), 11)}
 {savedsearch("Municipal cleaning","cleaning hygiene",
   minichip("Cleaning")+minichip("Municipalities")+minichip("Closing soon"), 6, alert=False)}

 <div style="background:#fff;border:1px dashed #D3DAE3;border-radius:16px;padding:14px;display:flex;align-items:center;gap:13px">
  <div style="width:44px;height:44px;border-radius:13px;background:var(--bg);color:var(--ink-3);display:flex;
   align-items:center;justify-content:center;flex:0 0 44px">{icon("plus",21,2)}</div>
  <div style="flex:1;min-width:0">
   <div style="font-size:14.5px;font-weight:600;letter-spacing:-.02em">Create a saved search</div>
   <div style="font-size:12px;color:var(--ink-2);line-height:17px;margin-top:2px">
    Save any search with its filters and get alerted when new tenders match.</div></div>
 </div>
 <div class="fade"></div>
</div>
{bottomnav("Search")}</div>''')

# ============ 18 TENDER DOCUMENTS ============
def docrow(name, meta, ico="pdf", last=False):
    bd = "" if last else "border-bottom:1px solid var(--line);"
    return (f'<div style="display:flex;align-items:center;gap:12px;padding:12px 0;{bd}">'
            f'<div style="width:38px;height:38px;border-radius:11px;background:var(--red-bg);color:var(--red);display:flex;'
            f'align-items:center;justify-content:center;flex:0 0 38px">{icon(ico,18,2)}</div>'
            f'<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600;letter-spacing:-.015em;'
            f'line-height:19px">{name}</div>'
            f'<div style="font-size:11.5px;color:var(--ink-3);margin-top:2px">{meta}</div></div>'
            f'<div class="bm">{icon("download",17,2)}</div></div>')

S[18] = page("", f'''<div class="screen">{statusbar()}
<div class="tnav">
 <div class="iconbtn g">{icon("back",21)}</div>
 <div style="text-align:center"><div style="font-size:16px;font-weight:600;letter-spacing:-.02em">Tender Documents</div>
  <div style="font-size:11.5px;color:var(--ink-3)">ETH/IT/2026/091</div></div>
 <div class="iconbtn g">{icon("share",19)}</div></div>
<div style="flex:1;overflow:hidden;position:relative;padding:16px 20px 0">
 <div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:13px;margin-bottom:16px">
  <div style="font-size:14.5px;font-weight:600;letter-spacing:-.02em;line-height:20px">
   Supply and Delivery of Computer Equipment</div>
  <div style="display:flex;align-items:center;gap:7px;margin-top:6px">
   {badge("Open","open")}<span style="font-size:12px;color:var(--ink-2)">eThekwini Municipality</span></div>
 </div>

 <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
  <div class="lbl">Tender documents · 4 files</div>
  <div style="font-size:12.5px;font-weight:600;color:var(--blue)">Download all</div></div>
 <div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:2px 14px;margin-bottom:16px">
  {docrow("Tender Specification Document","PDF · 2.4 MB · Updated 30 Aug 2026")}
  {docrow("Bill of Quantities","XLSX · 480 KB · Updated 28 Aug 2026", "doc")}
  {docrow("SBD Forms (1, 4, 6.1, 9)","PDF · 1.1 MB · Updated 28 Aug 2026")}
  {docrow("Special Conditions of Contract","PDF · 760 KB · Updated 28 Aug 2026", last=True)}
 </div>

 <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
  <div class="lbl">Addenda · 1 file</div>
  <span class="badge b-soon">New</span></div>
 <div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:2px 14px;margin-bottom:16px">
  {docrow("Addendum No. 1 — Briefing Minutes","PDF · 340 KB · Added 01 Sep 2026", last=True)}
 </div>

 <div style="background:var(--amber-bg);border-radius:14px;padding:13px;display:flex;gap:11px;align-items:flex-start">
  <span style="color:var(--amber);display:flex;flex:0 0 auto">{icon("info",18,2)}</span>
  <div style="font-size:12.5px;color:#8A5200;line-height:18px">
   Documents are provided by the issuing organisation. Always confirm against the official tender source before submitting.</div>
 </div>
 <div class="fade"></div>
</div>
<div style="padding:12px 20px 10px;background:#fff;border-top:1px solid var(--line)">
 <div class="btn btn-p" style="gap:8px">{icon("download",18,2)}Download All Documents</div></div>
{homebar()}</div>''')

# ============ 19 SEARCH — NO RESULTS ============
S[19] = page("", f'''<div class="screen">{statusbar()}
<div style="background:#fff;padding:6px 20px 14px;border-bottom:1px solid var(--line)">
 <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
  <h2 style="font-size:23px">Find tenders</h2>
  <div class="iconbtn g">{icon("cog",20)}</div></div>
 <div class="field" style="height:50px;border-color:var(--navy);box-shadow:0 0 0 3px rgba(15,42,71,.07)">
  {icon("search",19)}<span class="val" style="flex:1;font-weight:500">drone surveying limpopo</span>
  <span style="width:20px;height:20px;border-radius:50%;background:var(--bg);color:var(--ink-3);display:flex;align-items:center;justify-content:center">
   <svg width="10" height="10" viewBox="0 0 24 24"><path d="M5 5l14 14M19 5 5 19" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></span></div>
 <div style="display:flex;gap:9px;margin-top:12px">
  <div style="flex:1;height:42px;border-radius:11px;background:var(--navy);color:#fff;display:flex;align-items:center;
   justify-content:center;gap:7px;font-size:14px;font-weight:600">{icon("filter",18,2)}Filters
   <span style="background:rgba(255,255,255,.2);border-radius:9px;padding:1px 6px;font-size:11px">3</span></div>
  <div style="flex:1;height:42px;border-radius:11px;background:#fff;border:1.5px solid var(--line);color:var(--ink);
   display:flex;align-items:center;justify-content:center;gap:7px;font-size:14px;font-weight:600">{icon("sort",18,2)}Closing soon</div>
 </div>
</div>
<div style="flex:1;overflow:hidden;position:relative;padding:14px 20px 0">
 <div style="text-align:center;padding:6px 0 2px">
  <div style="width:64px;height:64px;border-radius:19px;background:#fff;border:1px solid var(--line);color:var(--ink-3);
   display:flex;align-items:center;justify-content:center;margin:0 auto 13px;box-shadow:var(--sh)">{icon("search",28,1.7)}</div>
  <div style="font-size:18px;font-weight:700;letter-spacing:-.03em">No tenders found</div>
  <div style="font-size:13.5px;color:var(--ink-2);line-height:20px;margin-top:7px;max-width:290px;margin-left:auto;margin-right:auto">
   We couldn't find tenders matching <b style="color:var(--ink)">"drone surveying limpopo"</b> with your current filters.</div>
 </div>

 <div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;margin-top:15px">
  <div style="font-size:13.5px;font-weight:600;letter-spacing:-.015em;margin-bottom:11px">Try adjusting your search</div>
  <div style="display:flex;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid var(--line)">
   <span style="color:var(--blue);display:flex">{icon("filter",16,2)}</span>
   <span style="font-size:13px;color:var(--ink-2);flex:1">Remove the <b style="color:var(--ink)">Limpopo</b> province filter</span>
   <span style="font-size:12.5px;font-weight:600;color:var(--blue)">Remove</span></div>
  <div style="display:flex;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid var(--line)">
   <span style="color:var(--blue);display:flex">{icon("money",16,2)}</span>
   <span style="font-size:13px;color:var(--ink-2);flex:1">Widen the value range below <b style="color:var(--ink)">R500k</b></span>
   <span style="font-size:12.5px;font-weight:600;color:var(--blue)">Widen</span></div>
  <div style="display:flex;align-items:center;gap:9px;padding:8px 0">
   <span style="color:var(--blue);display:flex">{icon("refresh",16,2)}</span>
   <span style="font-size:13px;color:var(--ink-2);flex:1">Clear all filters and search again</span>
   <span style="font-size:12.5px;font-weight:600;color:var(--blue)">Clear</span></div>
 </div>

 <div class="lbl" style="margin:16px 2px 9px">Related searches</div>
 <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">
  {chip("aerial survey")}{chip("land surveying")}{chip("GIS mapping")}{chip("Engineering · Limpopo")}</div>

 <div style="background:var(--blue-soft);border-radius:14px;padding:14px;display:flex;gap:12px;align-items:center">
  <div style="width:38px;height:38px;border-radius:11px;background:#fff;color:var(--blue);display:flex;
   align-items:center;justify-content:center;flex:0 0 38px">{icon("bell",18,2)}</div>
  <div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:600;color:var(--navy)">Alert me for this search</div>
   <div style="font-size:11.5px;color:var(--blue);line-height:16px;margin-top:2px">We'll notify you when a matching tender is published.</div></div>
  <div class="btn btn-p" style="width:auto;height:34px;font-size:12.5px;padding:0 14px;flex:0 0 auto">Create</div>
 </div>
 <div class="fade"></div>
</div>
{bottomnav("Search")}</div>''')

# ============ 20 SETTINGS ============
S[20] = page("", f'''<div class="screen">{statusbar()}
<div class="tnav">
 <div class="iconbtn g">{icon("back",21)}</div>
 <div style="font-size:16.5px;font-weight:600;letter-spacing:-.02em">Settings</div>
 <div style="width:38px"></div></div>
<div style="flex:1;overflow:hidden;position:relative;padding:16px 20px 0">
 {group("Account",
   listrow("user","Personal Details","Sipho Mkhize")+
   listrow("mail","Email Address","sipho@mkhize-solutions.co.za")+
   listrow("lock","Change Password","Last changed 4 months ago", last=True))}

 {group("Security",
   listrow("shieldc","Two-Factor Authentication", right='<span style="display:inline-flex;align-items:center;height:21px;padding:0 8px;border-radius:6px;background:var(--green-bg);color:var(--green);font-size:11px;font-weight:700">ON</span>', tone="green")+
   listrow("users","Active Sessions","2 devices signed in")+
   listrow("eye","Biometric Sign-In","Use fingerprint to unlock", right="on", last=True))}

 {group("App",
   listrow("globe","Language","English (South Africa)")+
   listrow("money","Currency Display","ZAR (R)")+
   listrow("download","Offline Mode","Cache saved tenders for offline access", right="off")+
   listrow("refresh","Background Sync","Refresh tenders every 30 minutes", right="on", last=True))}

 {group("Data",
   listrow("download","Export My Data","Download saved tenders as CSV")+
   listrow("trash","Clear Cache","18.4 MB", right='<span style="font-size:12.5px;color:var(--ink-3)">18.4 MB</span>', last=True))}

 {group("Legal",
   listrow("doc","Terms of Service")+
   listrow("shieldc","Privacy Policy")+
   listrow("help","Contact Support", last=True))}

 <div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:2px 14px;margin-bottom:14px">
  {listrow("trash","Delete Account","Permanently remove your account and data", right="", tone="red", last=True)}
 </div>
 <div style="text-align:center;font-size:11.5px;color:var(--ink-3);padding-bottom:14px;line-height:17px">
  TenderBase v1.4.2 (build 2026.09.01)<br>Made for South African business</div>
 <div class="fade"></div>
</div>
{homebar()}</div>''')

for k, v in S.items():
    open(os.path.join(OUT, f"s{k}.html"), "w").write(v)
print("wrote", sorted(S))
