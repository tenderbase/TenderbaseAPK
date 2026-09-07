import asyncio
from playwright.async_api import async_playwright
async def m():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--force-color-profile=srgb"])
        pg=await b.new_page(viewport={"width":1280,"height":900},device_scale_factor=1)
        await pg.goto("http://localhost:3000/search",wait_until="networkidle")
        await pg.wait_for_timeout(900)
        await pg.screenshot(path="/home/user/tenderbase/live/desktop-search.png")
        await b.close()
asyncio.run(m())
