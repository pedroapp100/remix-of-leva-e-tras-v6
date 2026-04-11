"""Debug script to diagnose login hang."""
import asyncio
from playwright.async_api import async_playwright

async def main():
    console_logs = []
    network_errors = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Capture console
        page.on("console", lambda msg: console_logs.append(f"[{msg.type.upper()}] {msg.text}"))
        # Capture request failures
        page.on("requestfailed", lambda req: network_errors.append(f"FAILED: {req.url} — {req.failure}"))
        # Capture responses
        responses = []
        page.on("response", lambda res: responses.append(f"{res.status} {res.url}") if "supabase" in res.url else None)

        print("=== Navigating to login page ===")
        await page.goto("http://127.0.0.1:8080/login", wait_until="networkidle", timeout=15000)
        await page.screenshot(path="debug_login_before.png")

        print("=== Filling credentials ===")
        await page.fill('input[type="email"]', "pedroaps100@gmail.com")
        await page.fill('input[type="password"]', "12345678")  # common guess, change if needed

        print("=== Submitting form ===")
        await page.click('button[type="submit"]')

        print("=== Waiting 20 seconds for result ===")
        try:
            # Wait for either navigation away from /login OR an error message
            await page.wait_for_url(lambda url: "/login" not in url, timeout=20000)
            print(">>> LOGIN SUCCESS — navigated to:", page.url)
        except Exception:
            print(">>> DID NOT NAVIGATE AWAY from /login after 20s")
            print(">>> Current URL:", page.url)

        await page.screenshot(path="debug_login_after.png")

        print("\n=== Console Logs ===")
        for log in console_logs:
            print(log)

        print("\n=== Supabase Network Responses ===")
        for r in responses:
            print(r)

        print("\n=== Network Errors ===")
        for e in network_errors:
            print(e)

        await browser.close()

asyncio.run(main())
