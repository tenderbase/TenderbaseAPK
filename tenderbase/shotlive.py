import asyncio
from playwright.async_api import async_playwright
PAGES=[("dashboard","/"),("search","/search"),("saved","/saved"),
       ("details","/tenders/eth-it-2026-091"),("summary","/tenders/eth-it-2026-091/summary"),
       ("match","/tenders/eth-it-2026-091/match")]
async def m():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--force-color-profile=srgb","--font-render-hinting=none"])
        pg=await b.new_page(viewport={"width":390,"height":844},device_scale_factor=2)
        for name,path in PAGES:
            await pg.goto(f"http://localhost:3000{path}",wait_until="networkidle")
            await pg.wait_for_timeout(900)
            await pg.screenshot(path=f"/home/user/tenderbase/live/{name}.png")
            print(name)
        await b.close()
asyncio.run(m())
