import { expect, test, type Page, type TestInfo } from "@playwright/test";

const ingressBase = "/api/hassio_ingress/test";
const localOrigin = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT || process.env.PORT || "3000"}`;

const viewports = [
    { name: "desktop", width: 1440, height: 900 },
    { name: "tablet-landscape", width: 1180, height: 820 },
    { name: "tablet-portrait", width: 820, height: 1180 },
    { name: "phone", width: 390, height: 844 },
] as const;

const routes = [
    { name: "dashboard", path: "/dashboard" },
    { name: "attention", path: "/attention" },
    { name: "presence", path: "/presence" },
    { name: "settings", path: "/settings" },
    { name: "music", path: "/music" },
    { name: "meals", path: "/meals" },
] as const;

async function collectLocalFailures(page: Page) {
    const failedResponses: string[] = [];

    page.on("response", (response) => {
        const url = new URL(response.url());
        if (url.origin !== localOrigin) return;
        if (response.status() >= 400) {
            failedResponses.push(`${response.status()} ${url.pathname}`);
        }
    });

    return failedResponses;
}

async function assertNoPageHorizontalOverflow(page: Page) {
    const overflow = await page.evaluate(() => {
        const documentWidth = document.documentElement.scrollWidth;
        const bodyWidth = document.body.scrollWidth;
        const viewportWidth = window.innerWidth;

        return Math.max(documentWidth, bodyWidth) - viewportWidth;
    });

    expect(overflow).toBeLessThanOrEqual(2);
}

async function assertReadableComputedContrast(page: Page) {
    const failures = await page.evaluate(() => {
        type Rgba = {
            r: number;
            g: number;
            b: number;
            a: number;
        };

        type Failure = {
            text: string;
            selector: string;
            ratio: number;
            foreground: string;
            background: string;
            backgroundSource: string;
        };

        const targetSelector = [
            "main h1",
            "main h2",
            "main h3",
            ".dashboard-card-surface :is(h1, h2, h3, p, span, button)",
            ".entity-detail :is(h3, p, dt, dd, button)",
            ".nav-label",
        ].join(", ");

        function parseCssColor(value: string): Rgba | null {
            const match = value.match(/^rgba?\((.+)\)$/i);
            if (!match) return null;

            const parts = match[1]
                .split(",")
                .map((part) => Number.parseFloat(part.trim()));

            if (parts.length < 3) return null;
            if (parts.slice(0, 3).some((part) => Number.isNaN(part))) return null;

            return {
                r: parts[0],
                g: parts[1],
                b: parts[2],
                a: Number.isFinite(parts[3]) ? parts[3] : 1,
            };
        }

        function channelToLinear(channel: number) {
            const value = channel / 255;
            return value <= 0.03928
                ? value / 12.92
                : Math.pow((value + 0.055) / 1.055, 2.4);
        }

        function luminance(color: Rgba) {
            return (
                0.2126 * channelToLinear(color.r) +
                0.7152 * channelToLinear(color.g) +
                0.0722 * channelToLinear(color.b)
            );
        }

        function contrastRatio(foreground: Rgba, background: Rgba) {
            const first = luminance(foreground);
            const second = luminance(background);
            const lighter = Math.max(first, second);
            const darker = Math.min(first, second);

            return (lighter + 0.05) / (darker + 0.05);
        }

        function textFor(element: Element) {
            return (element.textContent ?? "").replace(/\s+/g, " ").trim();
        }

        function elementLabel(element: HTMLElement) {
            const classes = Array.from(element.classList).slice(0, 3);
            if (classes.length > 0) {
                return `${element.tagName.toLowerCase()}.${classes.join(".")}`;
            }

            return element.tagName.toLowerCase();
        }

        function isVisibleText(element: HTMLElement) {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();

            return (
                rect.width > 4 &&
                rect.height > 4 &&
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                Number(style.opacity) > 0.45
            );
        }

        function nearestReadableBackground(element: HTMLElement) {
            let current: HTMLElement | null = element;

            while (current) {
                const style = getComputedStyle(current);
                const parsed = parseCssColor(style.backgroundColor);

                if (parsed && parsed.a > 0.25) {
                    return {
                        color: parsed,
                        value: style.backgroundColor,
                        source: elementLabel(current),
                    };
                }

                current = current.parentElement;
            }

            const bodyStyle = getComputedStyle(document.body);
            const bodyColor = parseCssColor(bodyStyle.backgroundColor);

            return bodyColor
                ? {
                        color: bodyColor,
                        value: bodyStyle.backgroundColor,
                        source: "body",
                    }
                : null;
        }

        const candidates = Array.from(document.querySelectorAll(targetSelector))
            .filter((element): element is HTMLElement => element instanceof HTMLElement)
            .filter((element) => !element.closest(".readable-on-image"))
            .filter((element) => !element.closest("[aria-hidden='true']"))
            .filter((element) => !element.hasAttribute("disabled"))
            .filter((element) => textFor(element).length > 0)
            .filter(isVisibleText);

        const checked = new Set<HTMLElement>();
        const failures: Failure[] = [];

        for (const element of candidates) {
            if (checked.has(element)) continue;
            checked.add(element);

            const style = getComputedStyle(element);
            const foreground = parseCssColor(style.color);
            const background = nearestReadableBackground(element);

            if (!foreground || foreground.a <= 0.45 || !background) continue;

            const ratio = contrastRatio(foreground, background.color);

            if (ratio < 3) {
                failures.push({
                    text: textFor(element).slice(0, 80),
                    selector: elementLabel(element),
                    ratio: Number(ratio.toFixed(2)),
                    foreground: style.color,
                    background: background.value,
                    backgroundSource: background.source,
                });
            }
        }

        return failures.slice(0, 8);
    });

    expect(
        failures,
        failures
            .map(
                (failure) =>
                    `${failure.selector} "${failure.text}" contrast ${failure.ratio}: ${failure.foreground} on ${failure.background} from ${failure.backgroundSource}`,
            )
            .join("\n"),
    ).toEqual([]);
}

async function assertImageTextProtection(page: Page) {
    const failures = await page.evaluate(() => {
        type Failure = {
            text: string;
            selector: string;
            color: string;
            hasProtection: boolean;
        };

        function parseCssColor(value: string) {
            const match = value.match(/^rgba?\((.+)\)$/i);
            if (!match) return null;

            const parts = match[1]
                .split(",")
                .map((part) => Number.parseFloat(part.trim()));

            if (parts.length < 3) return null;
            if (parts.slice(0, 3).some((part) => Number.isNaN(part))) return null;

            return {
                r: parts[0],
                g: parts[1],
                b: parts[2],
            };
        }

        function textFor(element: Element) {
            return (element.textContent ?? "").replace(/\s+/g, " ").trim();
        }

        function elementLabel(element: HTMLElement) {
            const classes = Array.from(element.classList).slice(0, 3);
            if (classes.length > 0) {
                return `${element.tagName.toLowerCase()}.${classes.join(".")}`;
            }

            return element.tagName.toLowerCase();
        }

        const failures: Failure[] = [];

        for (const element of Array.from(document.querySelectorAll(".readable-on-image"))) {
            if (!(element instanceof HTMLElement)) continue;
            const text = textFor(element);
            if (!text) continue;

            const style = getComputedStyle(element);
            const color = parseCssColor(style.color);
            const hasProtection = Boolean(element.closest(".readable-label-stack"));
            const usesReadableLightText = Boolean(
                color && color.r >= 220 && color.g >= 220 && color.b >= 220,
            );

            if (!hasProtection || !usesReadableLightText) {
                failures.push({
                    text: text.slice(0, 80),
                    selector: elementLabel(element),
                    color: style.color,
                    hasProtection,
                });
            }
        }

        return failures;
    });

    expect(
        failures,
        failures
            .map(
                (failure) =>
                    `${failure.selector} "${failure.text}" image text uses ${failure.color}; protected=${failure.hasProtection}`,
            )
            .join("\n"),
    ).toEqual([]);
}

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string) {
    await testInfo.attach(name, {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
    });
}

test.describe("visual acceptance smoke", () => {
    for (const viewport of viewports) {
        test(`${viewport.name} core routes render without local failures or page overflow`, async ({
            page,
        }, testInfo) => {
            await page.setViewportSize({
                width: viewport.width,
                height: viewport.height,
            });

            const failedResponses = await collectLocalFailures(page);

            for (const route of routes) {
                await page.goto(`${ingressBase}${route.path}`);

                await expect(page.locator("main")).toBeVisible();
                await expect(page.locator("body")).toBeVisible();
                await assertNoPageHorizontalOverflow(page);
                await assertReadableComputedContrast(page);
                await assertImageTextProtection(page);
                await attachScreenshot(page, testInfo, `${viewport.name}-${route.name}`);
            }

            expect(failedResponses).toEqual([]);
        });
    }
});
