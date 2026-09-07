import asyncio,sys
from playwright.async_api import async_playwright
async def m():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--force-color-profile=srgb","--font-render-hinting=none"])
        pg=await b.new_page(viewport={"width":390,"height":844},device_scale_factor=3)
        for i in range(1,11):
            await pg.goto(f"file:///home/user/tenderbase/s{i:02d}.html")
            await pg.wait_for_timeout(500)
            await pg.screenshot(path=f"/home/user/tenderbase/screens/{i:02d}.png")
            print(i)
        await b.close()
asyncio.run(m())
