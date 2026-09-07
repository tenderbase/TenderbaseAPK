# -*- coding: utf-8 -*-
import os, sys
from comp import *

OUT = os.path.dirname(os.path.abspath(__file__))
S = {}

# ============ 01 SPLASH ============
S[1] = page("""
body{background:#0F2A47}
.screen{background:
 radial-gradient(120% 70% at 50% 8%, #1A4270 0%, #0F2A47 55%, #0A1F36 100%)}
.gridbg{position:absolute;inset:0;opacity:.07;
 background-image:linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px);
 background-size:48px 48px;
 -webkit-mask-image:radial-gradient(70% 55% at 50% 42%,#000 0%,transparent 78%)}
""", f'''<div class="screen">{statusbar(True)}
<div class="gridbg"></div>
<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;padding-bottom:60px">
 <div style="position:relative">
  <div style="position:absolute;inset:-38px;border-radius:50%;background:rgba(78,146,214,.13);filter:blur(26px)"></div>
  {logo(74, light=True, name=False)}
 </div>
 <div style="font-size:33px;font-weight:700;letter-spacing:-.045em;color:#fff;margin-top:26px">
  Tender<span style="font-weight:400;color:#9DB8D4">Base</span></div>
 <div style="width:34px;height:2px;background:#4E92D6;border-radius:2px;margin:18px 0 16px"></div>
 <div style="font-size:14.5px;color:#A7BDD6;letter-spacing:-.005em">Find the opportunities that matter.</div>
</div>
<div style="position:absolute;left:0;right:0;bottom:74px;display:flex;flex-direction:column;align-items:center;gap:16px">
 <svg width="30" height="30" viewBox="0 0 50 50">
  <circle cx="25" cy="25" r="20" stroke="rgba(255,255,255,.15)" stroke-width="3.4" fill="none"/>
  <path d="M25 5a20 20 0 0 1 19 14" stroke="#4E92D6" stroke-width="3.4" stroke-linecap="round" fill="none"/>
 </svg>
 <div style="font-size:11.5px;color:#6C89AB;letter-spacing:.05em">SOUTH AFRICAN TENDER INTELLIGENCE</div>
</div>{homebar(True)}</div>''')

# ============ 02 WELCOME ============
def hero():
    return '''<svg width="330" height="228" viewBox="0 0 330 228" fill="none">
<defs><clipPath id="c1"><rect width="330" height="228" rx="20"/></clipPath></defs>
<g clip-path="url(#c1)">
<rect width="330" height="228" rx="20" fill="#F5F8FC"/>
<g opacity=".55" stroke="#D3E0EE" stroke-width="1">
 <path d="M0 38h330M0 76h330M0 114h330M0 152h330M0 190h330"/>
 <path d="M41 0v228M82 0v228M123 0v228M165 0v228M206 0v228M247 0v228M288 0v228"/></g>
<circle cx="262" cy="52" r="62" fill="#EAF1F9"/>
<!-- back doc -->
<g transform="rotate(-7 96 132)">
<rect x="36" y="60" width="118" height="146" rx="12" fill="#fff" stroke="#DCE4ED" stroke-width="1.5"/>
<rect x="52" y="82" width="56" height="8" rx="4" fill="#DCE4ED"/>
<rect x="52" y="100" width="82" height="6" rx="3" fill="#EDF1F6"/>
<rect x="52" y="114" width="70" height="6" rx="3" fill="#EDF1F6"/>
<rect x="52" y="128" width="78" height="6" rx="3" fill="#EDF1F6"/>
</g>
<!-- main card -->
<g filter="url(#sh)">
<rect x="96" y="44" width="150" height="152" rx="14" fill="#FFFFFF" stroke="#E1E8F0" stroke-width="1.5"/>
</g>
<rect x="114" y="62" width="48" height="18" rx="6" fill="#E6F4EF"/>
<circle cx="123" cy="71" r="3" fill="#12805C"/>
<rect x="129" y="67.5" width="26" height="7" rx="3.5" fill="#12805C" opacity=".75"/>
<rect x="114" y="92" width="112" height="9" rx="4.5" fill="#1B2430" opacity=".82"/>
<rect x="114" y="107" width="82" height="9" rx="4.5" fill="#1B2430" opacity=".55"/>
<rect x="114" y="130" width="60" height="6" rx="3" fill="#C9D4E1"/>
<rect x="114" y="144" width="74" height="6" rx="3" fill="#C9D4E1"/>
<line x1="114" y1="163" x2="228" y2="163" stroke="#EDF1F6" stroke-width="1.5"/>
<rect x="114" y="172" width="42" height="11" rx="5.5" fill="#0F2A47"/>
<rect x="204" y="170" width="24" height="15" rx="6" fill="#EAF1F9"/>
<!-- search bubble -->
<g transform="translate(206,120)">
<circle cx="34" cy="34" r="34" fill="#0F2A47"/>
<g stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round">
<circle cx="31" cy="31" r="11"/><path d="m40 40 6 6"/></g>
</g>
<!-- value tag -->
<g transform="translate(30,32)">
<rect width="92" height="34" rx="10" fill="#fff" stroke="#E1E8F0" stroke-width="1.5"/>
<circle cx="21" cy="17" r="9.5" fill="#EAF1F9"/>
<path d="M17.5 20.5 21 16l2.6 2.6L26 15.5" stroke="#2E6BA8" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="37" y="9" width="42" height="6.5" rx="3.25" fill="#C9D4E1"/>
<rect x="37" y="20" width="28" height="6.5" rx="3.25" fill="#E3E9F0"/>
</g>
<!-- deadline tag -->
<g transform="translate(212,16)">
<rect width="86" height="32" rx="10" fill="#FDF1E0"/>
<g stroke="#B36A00" stroke-width="2" fill="none" stroke-linecap="round">
<circle cx="18" cy="16" r="7.5"/><path d="M18 11.6V16l2.6 1.7"/></g>
<rect x="33" y="12.5" width="38" height="7" rx="3.5" fill="#B36A00" opacity=".55"/>
</g>
</g>
<filter id="sh"><feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0F2A47" flood-opacity=".10"/></filter>
</svg>'''

S[2] = page("", f'''<div class="screen" style="background:#fff">{statusbar()}
<div style="padding:8px 20px 0">{logo(30)}</div>
<div style="flex:1;display:flex;flex-direction:column;padding:0 20px">
 <div style="margin-top:24px;display:flex;justify-content:center">{hero()}</div>
 <div style="margin-top:34px">
  <h1 style="font-size:31px;line-height:37px">Find the right tenders.<br><span style="color:var(--blue)">Faster.</span></h1>
  <div class="sub" style="font-size:15px;line-height:23px;margin-top:12px;max-width:330px">
   Discover relevant tender opportunities, track deadlines and stay ahead of new opportunities.</div>
 </div>
 <div style="display:flex;gap:22px;margin-top:22px">
  <div style="display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--ink-2);font-weight:500">
   <span style="color:var(--green);display:flex">{icon("check",16,2.4)}</span>Daily updates</div>
  <div style="display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--ink-2);font-weight:500">
   <span style="color:var(--green);display:flex">{icon("check",16,2.4)}</span>All 9 provinces</div>
 </div>
 <div style="flex:1"></div>
 <div style="display:flex;gap:6px;justify-content:center;margin-bottom:20px">
  <span style="width:22px;height:6px;border-radius:3px;background:var(--navy)"></span>
  <span style="width:6px;height:6px;border-radius:3px;background:#D3DAE3"></span>
  <span style="width:6px;height:6px;border-radius:3px;background:#D3DAE3"></span></div>
 <div class="btn btn-p">Get Started {icon("chev",18,2.3)}</div>
 <div style="text-align:center;padding:18px 0 30px;font-size:14.5px;color:var(--ink-2)">
  I already have an account &nbsp;<span style="color:var(--navy);font-weight:600">Sign in</span></div>
</div>{homebar()}</div>''')

# ============ 03 LOGIN ============
S[3] = page("", f'''<div class="screen" style="background:#fff">{statusbar()}
<div style="padding:4px 16px 0;display:flex;align-items:center;justify-content:space-between">
 <div class="iconbtn g">{icon("back",21)}</div>{logo(28)}<div style="width:38px"></div></div>
<div style="flex:1;padding:26px 20px 0;position:relative;display:flex;flex-direction:column">
 <h1>Welcome to TenderBase</h1>
 <div class="sub" style="margin-top:8px;font-size:14.5px">Sign in to access your tender opportunities.</div>

 <div style="margin-top:30px">
  <label class="flabel">Email address</label>
  <div class="field"><span class="ico">{icon("mail",19)}</span><span class="val">sipho@mkhize-solutions.co.za</span></div>
 </div>
 <div style="margin-top:16px">
  <label class="flabel">Password</label>
  <div class="field focus"><span class="ico">{icon("lock",19)}</span>
   <span class="val" style="flex:1;letter-spacing:.22em;font-size:17px">••••••••••</span>
   <span class="ico">{icon("eye",19)}</span></div>
 </div>
 <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px">
  <div style="display:flex;align-items:center;gap:9px">
   <span style="width:20px;height:20px;border-radius:6px;background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:center">{icon("check",14,3)}</span>
   <span style="font-size:13.5px;color:var(--ink-2)">Keep me signed in</span></div>
  <div style="font-size:13.5px;font-weight:600;color:var(--blue)">Forgot password?</div>
 </div>

 <div class="btn btn-p" style="margin-top:26px">Sign In</div>

 <div style="display:flex;align-items:center;gap:14px;margin:26px 0">
  <span style="flex:1;height:1px;background:var(--line)"></span>
  <span style="font-size:11.5px;font-weight:600;color:var(--ink-3);letter-spacing:.08em">OR</span>
  <span style="flex:1;height:1px;background:var(--line)"></span></div>

 <div class="btn btn-s" style="height:50px;font-size:15px">
  <svg width="19" height="19" viewBox="0 0 48 48"><path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.8-.4-4H24v7.3h12.1c-.2 2-1.6 5-4.5 7l6.9 5.3c4.1-3.8 6.6-9.4 6.6-15.6z"/><path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.3c-1.8 1.3-4.3 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8 41.2 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.5 28.5c-.5-1.4-.7-2.9-.7-4.5s.3-3.1.7-4.5l-7.1-5.5C2.9 17 2 20.4 2 24s.9 7 2.4 10z"/><path fill="#EA4335" d="M24 10.4c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.2 29.9 2 24 2 15.4 2 8 6.8 4.4 14l7.1 5.5c1.8-5.3 6.7-9.1 12.5-9.1z"/></svg>
  Continue with Google</div>
 <div style="text-align:center;margin-top:20px;font-size:14.5px;color:var(--ink-2)">
  Don't have an account? <span style="color:var(--navy);font-weight:600">Create Account</span></div>
 <div style="flex:1"></div>
 <div style="text-align:center;font-size:11.5px;line-height:17px;color:var(--ink-3);padding-bottom:26px">
  By continuing you agree to TenderBase's<br>
  <span style="color:var(--ink-2);font-weight:500;text-decoration:underline">Terms of Service</span> and
  <span style="color:var(--ink-2);font-weight:500;text-decoration:underline">Privacy Policy</span>.</div>
</div>{homebar()}</div>''')

# ============ 04 PERSONALISE ============
CATS = [("build","Construction",1),("doc","IT &amp; Technology",1),("rand","Security",1),
        ("spray","Cleaning",0),("truck","Transport",0),("case","Professional Services",1),
        ("truck","Supply &amp; Delivery",1),("heart","Healthcare",0),("wrench","Engineering",0),
        ("search","Consulting",0),("mega","Marketing",0),("leaf","Agriculture",0)]
def catcard(ico,label,on):
    if on:
        return (f'<div style="background:var(--navy);border:1.5px solid var(--navy);border-radius:14px;padding:13px 12px;'
                f'position:relative;box-shadow:0 4px 12px rgba(15,42,71,.18)">'
                f'<div style="position:absolute;top:10px;right:10px;width:18px;height:18px;border-radius:50%;background:#fff;'
                f'color:var(--navy);display:flex;align-items:center;justify-content:center">{icon("check",12,3.2)}</div>'
                f'<div style="color:#8FB4DC;margin-bottom:22px">{icon(ico,20,1.9)}</div>'
                f'<div style="font-size:13.5px;font-weight:600;color:#fff;line-height:17px">{label}</div></div>')
    return (f'<div style="background:#fff;border:1.5px solid var(--line);border-radius:14px;padding:13px 12px">'
            f'<div style="color:var(--ink-3);margin-bottom:22px">{icon(ico,20,1.9)}</div>'
            f'<div style="font-size:13.5px;font-weight:500;color:var(--ink);line-height:17px">{label}</div></div>')

grid = "".join(catcard(*c) for c in CATS)
S[4] = page("", f'''<div class="screen">{statusbar()}
<div style="padding:4px 16px 0;display:flex;align-items:center;justify-content:space-between;background:var(--bg)">
 <div class="iconbtn">{icon("back",21)}</div>
 <div style="flex:1;padding:0 14px"><div style="height:5px;border-radius:3px;background:#DDE3EB;overflow:hidden">
  <div style="width:66%;height:100%;background:var(--navy);border-radius:3px"></div></div></div>
 <div style="font-size:12.5px;font-weight:600;color:var(--ink-3)">Step 2/3</div></div>
<div style="flex:1;padding:22px 20px 0;overflow:hidden">
 <h1 style="font-size:27px;line-height:33px">Let's personalise<br>your tenders</h1>
 <div class="sub" style="margin-top:8px">Select the industries and services you're interested in.</div>
 <div style="display:flex;align-items:center;gap:7px;margin-top:16px">
  <span class="badge b-cat" style="height:26px;padding:0 10px">5 selected</span>
  <span style="font-size:12.5px;color:var(--ink-3)">You can change this anytime in Preferences</span></div>
 <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px;margin-top:18px">{grid}</div>
</div>
<div style="padding:14px 20px 10px;background:#fff;border-top:1px solid var(--line)">
 <div class="btn btn-p">Continue {icon("chev",18,2.3)}</div>
 <div style="text-align:center;padding:11px 0 14px;font-size:13.5px;color:var(--ink-3);font-weight:500">Skip for now</div>
</div>{homebar()}</div>''')

# ============ 05 DASHBOARD ============
rec = tendercard(dict(T_COMP, saved=False, match=94))
cs1 = compactcard(dict(title="Provision of Security Services", org="KZN Dept. of Public Works",
      value="R8.7M", close="18 Sep 2026", days="Closes in 2 days", tone="urg"))
cs2 = compactcard(dict(title="Cleaning &amp; Hygiene Services: Regional Offices", org="Department of Health, KZN",
      value="R1.9M", close="09 Sep 2026", days="Closes in 5 days", tone="soon"))

S[5] = page("", f'''<div class="screen">{statusbar()}
<div style="background:#fff;padding:6px 20px 16px;border-bottom:1px solid var(--line)">
 <div style="display:flex;align-items:center;justify-content:space-between">
  <div>
   <div style="font-size:13px;color:var(--ink-3);font-weight:500">Good morning, Sipho</div>
   <div style="font-size:20px;font-weight:700;letter-spacing:-.035em;margin-top:2px">Your tender opportunities</div>
  </div>
  <div style="display:flex;align-items:center;gap:10px">
   <div class="iconbtn g" style="position:relative">{icon("bell",21)}
    <span style="position:absolute;top:7px;right:8px;width:8px;height:8px;border-radius:50%;background:var(--red);border:1.6px solid #fff"></span></div>
   <div style="width:38px;height:38px;border-radius:11px;background:var(--navy);color:#fff;display:flex;
    align-items:center;justify-content:center;font-size:14px;font-weight:600;letter-spacing:0">SM</div>
  </div></div>
 <div style="margin-top:14px">{searchbar("Search tenders...", f'<span style="color:var(--ink-3);display:flex;padding-left:10px;border-left:1px solid var(--line)">{icon("filter",19)}</span>')}</div>
</div>
<div style="flex:1;overflow:hidden;position:relative;padding:16px 20px 0">
 {sectionhead("Your opportunities")}
 <div style="display:flex;gap:9px">
  {stat("New this week","42","spark","navy")}
  {stat("Closing soon","8","clock","amber")}
  {stat("Saved","17","bookmark","green")}
 </div>
 <div style="display:flex;align-items:center;gap:11px;background:var(--ai-bg);border-radius:12px;padding:9px 11px;margin-top:12px">
  <div style="width:30px;height:30px;border-radius:9px;background:#fff;color:var(--ai);display:flex;
   align-items:center;justify-content:center;flex:0 0 30px">{icon("ai",16,2.1)}</div>
  <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:var(--ai)">Your weekly briefing is ready</div>
   <div style="font-size:11.5px;color:var(--ai);opacity:.8;margin-top:1px">18 new matches · 4 closing next week</div></div>
  <span style="color:var(--ai);display:flex">{icon("chev",16,2.3)}</span>
 </div>
 <div style="margin-top:15px">{sectionhead("Recommended for you","See all")}</div>
 {rec}
 <div style="margin-top:13px">{sectionhead("Closing soon","See all")}</div>
 {cs1}{cs2}
 <div class="fade"></div>
</div>
{bottomnav("Home")}</div>''')

# ============ 06 SEARCH ============
results = "".join([
 tendercard(dict(T_SEC, saved=False, match=91)),
 tendercard(dict(title="Security Guarding Services for Municipal Facilities", org="Msunduzi Local Municipality",
   cat="Security", loc="Pietermaritzburg, KZN", close="24 Sep 2026", value="R3.2M",
   days="22 days left", tone="mute", status="open", num="MSU/SEC/2026/117", saved=True, match=84)),
 tendercard(dict(title="Access Control and CCTV Monitoring Systems", org="Transnet SOC Ltd",
   cat="Security", loc="Durban, KwaZulu-Natal", close="08 Sep 2026", value="R12.5M",
   days="Closes in 6 days", tone="soon", status="soon", num="TNPA/2026/0934", saved=False, match=76)),
])
chips = "".join([chip("All",True), chip("New"), chip("Closing Soon"), chip("High Value"), chip("My Categories")])
S[6] = page("", f'''<div class="screen">{statusbar()}
<div style="background:#fff;padding:6px 20px 14px;border-bottom:1px solid var(--line)">
 <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
  <h2 style="font-size:23px">Find tenders</h2>
  <div class="iconbtn g">{icon("cog",20)}</div></div>
 <div class="field" style="height:50px;border-color:var(--navy);box-shadow:0 0 0 3px rgba(15,42,71,.07)">
  {icon("search",19)}<span class="val" style="flex:1;font-weight:500">security services</span>
  <span style="width:20px;height:20px;border-radius:50%;background:var(--bg);color:var(--ink-3);display:flex;align-items:center;justify-content:center">
   <svg width="10" height="10" viewBox="0 0 24 24"><path d="M5 5l14 14M19 5 5 19" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></span></div>
 <div style="display:flex;gap:9px;margin-top:12px">
  <div style="flex:1;height:42px;border-radius:11px;background:var(--navy);color:#fff;display:flex;align-items:center;
   justify-content:center;gap:7px;font-size:14px;font-weight:600">{icon("filter",18,2)}Filters
   <span style="background:rgba(255,255,255,.2);border-radius:9px;padding:1px 6px;font-size:11px">2</span></div>
  <div style="flex:1;height:42px;border-radius:11px;background:#fff;border:1.5px solid var(--line);color:var(--ink);
   display:flex;align-items:center;justify-content:center;gap:7px;font-size:14px;font-weight:600">{icon("sort",18,2)}Closing soon</div>
 </div>
 <div class="row" style="margin-top:12px;overflow:hidden">{chips}</div>
</div>
<div style="flex:1;overflow:hidden;position:relative;padding:14px 20px 0">
 <div style="display:flex;align-items:center;justify-content:between;justify-content:space-between;margin-bottom:12px">
  <div style="font-size:13px;color:var(--ink-2)"><b style="color:var(--ink);font-weight:700">148</b> tenders found</div>
  <div style="display:flex;gap:6px;align-items:center;font-size:12px;font-weight:600;color:var(--ai)">{icon("ai",14,2.1)}Sorted by AI match</div></div>
 {results}
 <div class="fade"></div>
</div>
{bottomnav("Search")}</div>''')

# ============ 07 FILTERS ============
def togrow(label, on, sub=""):
    box = (f'<span style="width:22px;height:22px;border-radius:7px;background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:center">{icon("check",14,3)}</span>'
           if on else '<span style="width:22px;height:22px;border-radius:7px;border:1.6px solid #D3DAE3;background:#fff"></span>')
    s = f'<div style="font-size:11.5px;color:var(--ink-3)">{sub}</div>' if sub else ""
    return (f'<div style="display:flex;align-items:center;justify-content:space-between;padding:11px 0">'
            f'<div><div style="font-size:14.5px;font-weight:{600 if on else 500};color:var(--ink)">{label}</div>{s}</div>{box}</div>')

provs = "".join([chip("KwaZulu-Natal",True,"outline"), chip("Gauteng",True,"outline"), chip("Western Cape"),
                 chip("Eastern Cape"), chip("Free State"), chip("Limpopo"), chip("Mpumalanga"),
                 chip("North West"), chip("Northern Cape")])
def fsec(title, body, chevron=False):
    ch = f'<span style="color:var(--ink-3)">{icon("chevd",18)}</span>' if chevron else ""
    return (f'<div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:10px">'
            f'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:{10 if body else 0}px">'
            f'<div style="font-size:15px;font-weight:600;letter-spacing:-.015em">{title}</div>{ch}</div>{body}</div>')

slider = '''<div style="padding:6px 2px 0">
<div style="display:flex;justify-content:space-between;margin-bottom:14px">
 <div><div style="font-size:11px;color:var(--ink-3);font-weight:600;letter-spacing:.06em">MIN</div>
  <div style="font-size:15px;font-weight:700;color:var(--navy)">R500 000</div></div>
 <div style="text-align:right"><div style="font-size:11px;color:var(--ink-3);font-weight:600;letter-spacing:.06em">MAX</div>
  <div style="font-size:15px;font-weight:700;color:var(--navy)">R15M+</div></div></div>
<div style="position:relative;height:6px;background:#E6EAF0;border-radius:3px;margin:0 10px">
 <div style="position:absolute;left:14%;right:22%;top:0;bottom:0;background:var(--navy);border-radius:3px"></div>
 <div style="position:absolute;left:14%;top:-8px;margin-left:-11px;width:22px;height:22px;border-radius:50%;background:#fff;border:2.5px solid var(--navy);box-shadow:0 2px 6px rgba(15,42,71,.25)"></div>
 <div style="position:absolute;right:22%;top:-8px;margin-right:-11px;width:22px;height:22px;border-radius:50%;background:#fff;border:2.5px solid var(--navy);box-shadow:0 2px 6px rgba(15,42,71,.25)"></div>
</div></div>'''

S[7] = page("", f'''<div class="screen">{statusbar()}
<div class="tnav" style="padding:0 16px">
 <div class="iconbtn g"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M5 5l14 14M19 5 5 19" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></div>
 <div style="font-size:16.5px;font-weight:600;letter-spacing:-.02em">Filter tenders</div>
 <div style="font-size:14px;font-weight:600;color:var(--blue)">Reset</div></div>
<div style="flex:1;overflow:hidden;position:relative;padding:14px 20px 0">
 {fsec("Category", '<div class="row" style="flex-wrap:wrap;gap:8px">'+chip("Security",True,"outline")+chip("IT &amp; Technology",True,"outline")+chip("Construction")+chip("+ 9 more")+'</div>')}
 {fsec("Province", f'<div style="display:flex;flex-wrap:wrap;gap:8px">{provs}</div>')}
 {fsec("Tender status", togrow("Open","1","Currently accepting submissions")+'<div style="height:1px;background:var(--line)"></div>'+togrow("Closing Soon","1","Within the next 7 days")+'<div style="height:1px;background:var(--line)"></div>'+togrow("Recently Published","",""))}
 <div style="display:flex;gap:10px;margin-bottom:10px">
  <div style="flex:1;background:#fff;border:1px solid var(--line);border-radius:14px;padding:13px">
   <div style="font-size:12px;color:var(--ink-3);font-weight:600;margin-bottom:5px">Contract type</div>
   <div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:14px;font-weight:600">Goods</span>{icon("chevd",16,2,extra='style="color:var(--ink-3)"')}</div></div>
  <div style="flex:1;background:#fff;border:1px solid var(--line);border-radius:14px;padding:13px">
   <div style="font-size:12px;color:var(--ink-3);font-weight:600;margin-bottom:5px">Organisation</div>
   <div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:14px;font-weight:600">All</span>{icon("chevd",16,2,extra='style="color:var(--ink-3)"')}</div></div>
 </div>
 {fsec("Closing date", '<div class="row" style="gap:8px">'+chip("Next 7 days",True,"outline")+chip("Next 30 days")+chip("Custom range")+'</div>')}
 {fsec("Tender value", slider)}
 <div class="fade"></div>
</div>
<div style="padding:12px 20px 10px;background:#fff;border-top:1px solid var(--line);display:flex;gap:10px">
 <div class="btn btn-s" style="flex:0 0 112px">Reset</div>
 <div class="btn btn-p" style="flex:1">Apply Filters · 148</div>
</div>{homebar()}</div>''')

# ============ 08 DETAILS ============
def kv(k,v):
    return (f'<div style="display:flex;justify-content:space-between;align-items:center;padding:11px 0">'
            f'<span style="font-size:13.5px;color:var(--ink-2)">{k}</span>'
            f'<span style="font-size:13.5px;font-weight:600;color:var(--ink);text-align:right">{v}</span></div>')
def acc(ico,title,sub):
    return (f'<div style="display:flex;align-items:center;gap:12px;background:#fff;border:1px solid var(--line);'
            f'border-radius:14px;padding:11px 13px;margin-bottom:8px">'
            f'<div style="width:36px;height:36px;border-radius:10px;background:var(--bg);color:var(--navy);'
            f'display:flex;align-items:center;justify-content:center;flex:0 0 34px">{icon(ico,17,2)}</div>'
            f'<div style="flex:1"><div style="font-size:14.5px;font-weight:600;letter-spacing:-.015em">{title}</div>'
            f'<div style="font-size:12px;color:var(--ink-3);margin-top:1px">{sub}</div></div>'
            f'<span style="color:var(--ink-3)">{icon("chev",17,2)}</span></div>')

S[8] = page("", f'''<div class="screen" style="background:#fff">{statusbar()}
<div class="tnav" style="border:none">
 <div class="iconbtn g">{icon("back",21)}</div>
 <div style="display:flex;gap:9px"><div class="iconbtn g">{icon("share",19)}</div>
  <div class="iconbtn" style="background:var(--navy);color:#fff">{icon("bookmark",19,1.9,extra='fill="currentColor"')}</div></div></div>
<div style="flex:1;overflow:hidden;position:relative;padding:6px 20px 0;background:var(--bg)">
 <div style="display:flex;gap:6px;margin-top:8px">{badge("Open","open")}{badge("IT &amp; Technology","cat")}</div>
 <h2 style="font-size:21.5px;line-height:27px;margin-top:10px">Supply and Delivery of Computer Equipment</h2>
 <div style="display:flex;align-items:center;gap:7px;margin-top:9px;font-size:13.5px;color:var(--ink-2)">
  {icon("build",16,1.9)}eThekwini Municipality</div>

 <div style="background:var(--navy);border-radius:16px;padding:14px;margin-top:14px;display:flex;
  box-shadow:0 8px 20px rgba(15,42,71,.20)">
  <div style="flex:1.15">
   <div style="font-size:10.5px;font-weight:600;letter-spacing:.07em;color:#8FB4DC">CLOSING DATE</div>
   <div style="font-size:15px;font-weight:700;color:#fff;margin-top:5px;letter-spacing:-.02em">12 Sep 2026</div></div>
  <div style="width:1px;background:rgba(255,255,255,.15);margin:0 12px"></div>
  <div style="flex:1">
   <div style="font-size:10.5px;font-weight:600;letter-spacing:.07em;color:#8FB4DC">DAYS LEFT</div>
   <div style="font-size:15px;font-weight:700;color:#F3B15C;margin-top:5px;letter-spacing:-.02em">10 days</div></div>
  <div style="width:1px;background:rgba(255,255,255,.15);margin:0 12px"></div>
  <div style="flex:1">
   <div style="font-size:10.5px;font-weight:600;letter-spacing:.07em;color:#8FB4DC">VALUE</div>
   <div style="font-size:15px;font-weight:700;color:#fff;margin-top:5px;letter-spacing:-.02em">R2.4M</div></div>
 </div>

 <div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:0 14px;margin-top:10px">
  {kv("Tender Number","ETH/IT/2026/091")}<div style="height:1px;background:var(--line)"></div>
  {kv("Category","IT &amp; Technology")}<div style="height:1px;background:var(--line)"></div>
  {kv("Location","KwaZulu-Natal")}<div style="height:1px;background:var(--line)"></div>
  {kv("Published","28 Aug 2026")}
 </div>

 <div class="ai-card" style="padding:13px;margin-top:14px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:9px">
   <span class="ai-badge">{icon("ai",12,2.2)}AI Summary</span>
   <span style="font-size:11px;color:var(--ink-3)">From 4 documents</span></div>
  <div style="font-size:13.5px;line-height:20px;color:var(--ink-2)">
   Supplier to deliver desktop computers, laptops and peripherals to municipal offices over a
   <b style="color:var(--ink)">12-month period</b>. Compulsory briefing was held 4 Sep.</div>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-top:11px;padding-top:10px;
   border-top:1px solid var(--line)">
   <span style="display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:600;color:var(--ai)">
    Read full summary{icon("chev",14,2.3)}</span>
   <span style="display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:600;color:var(--ai)">
    {icon("send",13,2.2)}Ask</span></div>
 </div>
 <div style="display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--line);
  border-radius:14px;padding:11px 13px;margin-top:11px">
  <div style="width:34px;height:34px;border-radius:10px;background:var(--green-bg);color:var(--green);
   display:flex;align-items:center;justify-content:center;flex:0 0 34px">{icon("target",17,2)}</div>
  <div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:600;letter-spacing:-.015em">79% match for your profile</div>
   <div style="font-size:11.5px;color:var(--ink-3);margin-top:1px">3 of 4 requirements met</div></div>
  <span style="color:var(--ink-3)">{icon("chev",16,2)}</span>
 </div>
 <div style="margin-top:15px">{sectionhead("Description")}</div>
 <div style="font-size:14px;line-height:22px;color:var(--ink-2);margin-top:-4px">
  Supply and delivery of computer equipment and related accessories for municipal offices across the eThekwini
  metropolitan region. <span style="color:var(--blue);font-weight:600">Read more</span></div>

 <div style="margin-top:15px">{sectionhead("Tender information")}</div>
 {acc("check","Requirements","CIDB grading, BBBEE, tax clearance")}
 {acc("cal","Important Dates","Briefing 04 Sep · Closes 12 Sep")}
 {acc("doc","Documents","4 files · Specification, BOQ, SBD forms")}
 {acc("phone","Contact Information","Supply Chain Management Unit")}
 <div class="fade"></div>
</div>
<div style="padding:12px 20px 10px;background:#fff;border-top:1px solid var(--line)">
 <div style="display:flex;gap:10px">
  <div class="btn" style="flex:0 0 124px;gap:6px;background:var(--ai-bg);color:var(--ai)">{icon("ai",18,2)}Summarise</div>
  <div class="btn btn-p" style="flex:1;gap:7px">{icon("doc",18,2)}View Documents</div></div>
 <div style="text-align:center;padding:10px 0 14px;font-size:13px;font-weight:600;color:var(--blue);
  display:flex;align-items:center;justify-content:center;gap:6px">Visit tender source {icon("chev",14,2.4)}</div>
</div>{homebar()}</div>''')

# ============ 09 SAVED ============
def savedcard(t):
    return f'''<div class="card" style="margin-bottom:12px">
<div style="display:flex;gap:10px;align-items:flex-start">
 <div style="flex:1;min-width:0">
  <div style="display:flex;gap:6px;margin-bottom:8px">{deadline(t["days"], t["tone"])}{matchbadge(t["match"]) if t.get("match") else ""}</div>
  <div class="tc-title">{t["title"]}</div>
  <div class="tc-org">{icon("build",14,1.9)}{t["org"]}</div>
  <div style="margin-top:9px">{badge(t["cat"],"cat")}</div>
 </div>{bookmark(True)}</div>
<div class="tc-foot">
 <div style="display:flex;align-items:center;gap:12px">
  <span class="val">{t["value"]}</span>
  <span class="meta">{icon("cal",14,1.9)}{t["close"]}</span></div>
 <div style="font-size:11.5px;color:var(--ink-3)">Saved {t["saved_at"]}</div>
</div></div>'''

sv = "".join([
 savedcard(dict(title="Supply and Delivery of Computer Equipment", org="eThekwini Municipality", cat="IT &amp; Technology",
   value="R2.4M", close="12 Sep 2026", days="Closes in 3 days", tone="urg", saved_at="2 days ago", match=94)),
 savedcard(dict(title="Security Services for Municipal Facilities", org="KZN Department of Public Works", cat="Security",
   value="R8.7M", close="18 Sep 2026", days="Closes in 12 days", tone="soon", saved_at="5 days ago", match=88)),
])
tabs = ''.join([
 '<div style="flex:1;height:36px;border-radius:9px;background:#fff;box-shadow:var(--sh-sm);display:flex;align-items:center;justify-content:center;gap:6px;font-size:13.5px;font-weight:600;color:var(--navy)">All <span style="background:var(--blue-soft);color:var(--blue);border-radius:8px;padding:1px 6px;font-size:11px">17</span></div>',
 '<div style="flex:1;height:36px;display:flex;align-items:center;justify-content:center;font-size:13.5px;font-weight:500;color:var(--ink-2)">Closing Soon</div>',
 '<div style="flex:1;height:36px;display:flex;align-items:center;justify-content:center;font-size:13.5px;font-weight:500;color:var(--ink-2)">Recently Saved</div>'])

empty = f'''<div style="background:#fff;border:1px dashed #D3DAE3;border-radius:16px;padding:14px;margin-top:0;display:flex;align-items:center;gap:13px">
 <div style="width:46px;height:46px;border-radius:14px;background:var(--bg);color:var(--ink-3);display:flex;
  align-items:center;justify-content:center;flex:0 0 46px">{icon("bookmark",22,1.7)}</div>
 <div style="flex:1;min-width:0">
  <div style="font-size:10px;font-weight:700;letter-spacing:.08em;color:var(--ink-3);margin-bottom:3px">EMPTY STATE</div>
  <div style="font-size:14.5px;font-weight:600;letter-spacing:-.02em">No saved tenders yet</div>
  <div style="font-size:12px;color:var(--ink-2);line-height:17px;margin-top:2px">Save tenders you're interested in and they'll appear here.</div>
  <div class="btn btn-p" style="width:auto;display:inline-flex;height:36px;font-size:13px;padding:0 16px;margin-top:9px">Explore Tenders</div>
 </div></div>'''

S[9] = page("", f'''<div class="screen">{statusbar()}
<div style="background:#fff;padding:8px 20px 14px;border-bottom:1px solid var(--line)">
 <div style="display:flex;align-items:flex-start;justify-content:space-between">
  <div><h2 style="font-size:23px">Saved Tenders</h2>
   <div class="sub" style="font-size:13px;margin-top:4px">Keep track of opportunities you're interested in.</div></div>
  <div class="iconbtn g">{icon("sort",20)}</div></div>
 <div style="display:flex;gap:4px;background:var(--bg);border-radius:11px;padding:4px;margin-top:14px">{tabs}</div>
</div>
<div style="flex:1;overflow:hidden;position:relative;padding:14px 20px 0">
 {sv}
 {empty}
 <div class="fade"></div>
</div>
{bottomnav("Saved")}</div>''')

# ============ 10 ALERTS ============
n1 = notif(dict(ico="ai",tone="new",unread=True,title="New 94% match for your profile",
  desc="IT equipment tender published by eThekwini Municipality.",time="2h ago"))
n2 = notif(dict(ico="clock",tone="soon",unread=True,title="Closing soon",
  desc="Security Services tender closes in 2 days.",time="5h ago"))
n3 = notif(dict(ico="doc",tone="upd",unread=False,title="Saved tender updated",
  desc="Documents have been updated for Supply and Delivery of Computer Equipment.",time="Yesterday"))
n4 = notif(dict(ico="spark",tone="new",unread=False,title="6 new tenders in KwaZulu-Natal",
  desc="Matching Construction and Supply &amp; Delivery.",time="Yesterday"))
n5 = notif(dict(ico="flag",tone="mute",unread=False,title="Tender closed",
  desc="Fleet Maintenance Services has closed.",time="28 Aug"))

def grp(t): return f'<div class="lbl" style="margin:11px 2px 6px">{t}</div>'

S[10] = page("", f'''<div class="screen">{statusbar()}
<div style="background:#fff;padding:8px 20px 14px;border-bottom:1px solid var(--line)">
 <div style="display:flex;align-items:center;justify-content:space-between">
  <div style="display:flex;align-items:center;gap:9px">
   <h2 style="font-size:23px">Alerts</h2>
   <span style="background:var(--red);color:#fff;font-size:11px;font-weight:700;border-radius:9px;padding:2px 7px">2 new</span></div>
  <div style="font-size:13.5px;font-weight:600;color:var(--blue)">Mark all as read</div></div>
 <div style="display:flex;gap:8px;margin-top:11px">{chip("All",True)}{chip("New tenders")}{chip("Deadlines")}{chip("Updates")}</div>
</div>
<div style="flex:1;overflow:hidden;position:relative;padding:0 20px">
 <div style="display:flex;align-items:center;gap:10px;background:var(--blue-soft);border-radius:13px;padding:11px 12px;margin-top:12px">
  <span style="color:var(--blue);display:flex">{icon("bell",19,2)}</span>
  <div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--navy)">Monitoring 5 categories</div>
   <div style="font-size:11.5px;color:var(--blue)">AI matching across KwaZulu-Natal and Gauteng</div></div>
  <div style="font-size:12.5px;font-weight:600;color:var(--navy);display:flex;align-items:center;gap:3px">Edit{icon("chev",14,2.4)}</div>
 </div>
 {grp("Today")}{n1}{n2}
 {grp("Yesterday")}{n3}{n4}
 {grp("Earlier")}{n5}
 <div style="display:flex;align-items:center;justify-content:center;gap:8px;background:#fff;border:1px solid var(--line);
  border-radius:13px;height:46px;margin-top:6px;font-size:14px;font-weight:600;color:var(--navy)">
  {icon("cog",18,2)}Manage alert preferences</div>
 <div class="fade"></div>
</div>
{bottomnav("Alerts")}</div>''')

for k, v in S.items():
    open(os.path.join(OUT, f"s{k:02d}.html"), "w").write(v)
print("wrote", len(S))
