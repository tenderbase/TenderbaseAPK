import asyncio
from playwright.async_api import async_playwright
async def m():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--force-color-profile=srgb","--font-render-hinting=none"])
        pg=await b.new_page(viewport={"width":390,"height":844},device_scale_factor=3)
        for i in range(11,21):
            await pg.goto(f"file:///home/user/tenderbase/s{i}.html")
            await pg.wait_for_timeout(450)
            await pg.screenshot(path=f"/home/user/tenderbase/screens/{i}.png")
        await b.close()
asyncio.run(m())
