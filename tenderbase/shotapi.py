from playwright.sync_api import sync_playwright
import pathlib
out = pathlib.Path('/home/user/tenderbase/live'); out.mkdir(exist_ok=True)
pages = [("dashboard","/"),("search","/search?q=security"),("detail","/tenders/1066")]
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width":390,"height":844}, device_scale_factor=2)
    for name, path in pages:
        pg.goto("http://localhost:3000"+path, wait_until="networkidle", timeout=90000)
        pg.wait_for_timeout(1200)
        pg.screenshot(path=str(out/f"api-{name}.png"))
        print("shot", name)
    b.close()
