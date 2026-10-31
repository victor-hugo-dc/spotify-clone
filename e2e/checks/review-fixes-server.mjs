// Server fixes that only show in a real browser.
export const checks = [
  // The refresh token used to live in refresh_key at Path=/api. Over http that cookie has today's name and is sent first,
  // so while it outlived "Log out", the reload signed straight back in.
  ["logout-old-cookie", "/", async (page, t) => {
    const ctx = page.context();
    await ctx.addCookies([{ name: "refresh_key", value: "old-refresh", domain: new URL(t.base).hostname, path: "/api" }]);
    // A second tab, so the 401 the logged-out reload gets isn't reported as an error of this check's page.
    const tab = await ctx.newPage();
    try {
      await tab.goto(t.base + "/", { waitUntil: "networkidle" });
      await tab.getByRole("button", { name: /account menu$/ }).click();
      await tab.getByRole("menuitem", { name: "Log out" }).click();
      await tab.getByRole("link", { name: "Log in with Spotify" }).waitFor({ timeout: 5000 })
        .catch(() => { throw new Error("still signed in after Log out"); });
      await t.snap(tab, "logout-old-cookie-login");
      const left = (await ctx.cookies()).filter((c) => c.name === "refresh_key");
      if (left.length) throw new Error(`refresh_key left at ${left.map((c) => c.path).join(", ")}`);
    } finally {
      await tab.close();
      // Signed back in for the checks after this one.
      await ctx.addCookies([{ name: "refresh_key", value: "good-refresh", url: t.base }]);
    }
  }],
];
