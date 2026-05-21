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
    const screenshot = await page.screenshot({ scale: "css" });
    const failures = await page.evaluate(async (screenshotDataUrl) => {
        type Failure = {
            text: string;
            selector: string;
            color: string;
            hasProtection: boolean;
            hasLocalShield: boolean;
            hasEdgeGradient: boolean;
            ratio: number | null;
            sampledBackground: string | null;
        };

        type Rgb = {
            r: number;
            g: number;
            b: number;
        };

        function parseCssColor(value: string): Rgb | null {
            const match = value.match(/^rgba?\((.+)\)$/i);
            if (!match) return null;

            const parts = match[1]
                .replaceAll(",", " ")
                .split(/\s+/)
                .filter((part) => part && part !== "/")
                .map((part) => Number.parseFloat(part.trim()));

            if (parts.length < 3) return null;
            if (parts.slice(0, 3).some((part) => Number.isNaN(part))) return null;

            return {
                r: parts[0],
                g: parts[1],
                b: parts[2],
            };
        }

        function channelToLinear(channel: number) {
            const value = channel / 255;
            return value <= 0.03928
                ? value / 12.92
                : Math.pow((value + 0.055) / 1.055, 2.4);
        }

        function luminance(color: Rgb) {
            return (
                0.2126 * channelToLinear(color.r) +
                0.7152 * channelToLinear(color.g) +
                0.0722 * channelToLinear(color.b)
            );
        }

        function contrastRatio(foreground: Rgb, background: Rgb) {
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

        function isVisibleInViewport(element: HTMLElement) {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();

            return (
                rect.width > 4 &&
                rect.height > 4 &&
                rect.bottom > 0 &&
                rect.right > 0 &&
                rect.top < window.innerHeight &&
                rect.left < window.innerWidth &&
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                Number(style.opacity) > 0.45
            );
        }

        function hasPseudoShield(element: HTMLElement) {
            const style = getComputedStyle(element, "::before");

            return (
                style.content !== "none" &&
                style.content !== "" &&
                (style.backgroundImage !== "none" ||
                    style.backgroundColor !== "rgba(0, 0, 0, 0)") &&
                (style.backdropFilter !== "none" ||
                    style.webkitBackdropFilter !== "none" ||
                    style.backgroundImage !== "none")
            );
        }

        function hasRelevantEdgeGradient(element: HTMLElement) {
            const surface = element.closest(".dashboard-card-surface");
            if (!surface) return false;

            const labelRect = element.getBoundingClientRect();
            const labelCenterY = labelRect.top + labelRect.height / 2;
            const gradients = Array.from(
                surface.querySelectorAll(
                    ".readable-edge-gradient-top, .readable-edge-gradient-bottom",
                ),
            ).filter((candidate): candidate is HTMLElement => candidate instanceof HTMLElement);

            return gradients.some((gradient) => {
                const rect = gradient.getBoundingClientRect();
                const style = getComputedStyle(gradient);

                return (
                    rect.width > 0 &&
                    rect.height > 0 &&
                    style.backgroundImage !== "none" &&
                    labelCenterY >= rect.top - 2 &&
                    labelCenterY <= rect.bottom + 2
                );
            });
        }

        function loadScreenshot() {
            return new Promise<HTMLImageElement>((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = () => reject(new Error("Could not decode screenshot"));
                image.src = screenshotDataUrl;
            });
        }

        const screenshot = await loadScreenshot();
        const canvas = document.createElement("canvas");
        canvas.width = screenshot.naturalWidth;
        canvas.height = screenshot.naturalHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return [{ text: "canvas", selector: "canvas", color: "n/a", hasProtection: false, hasLocalShield: false, hasEdgeGradient: false, ratio: null, sampledBackground: null }];
        context.drawImage(screenshot, 0, 0);

        function sampleProtectedRegion(element: HTMLElement, foreground: Rgb) {
            const rect = element.getBoundingClientRect();
            const left = Math.max(0, Math.floor(rect.left - 10));
            const top = Math.max(0, Math.floor(rect.top - 8));
            const right = Math.min(canvas.width - 1, Math.ceil(rect.right + 10));
            const bottom = Math.min(canvas.height - 1, Math.ceil(rect.bottom + 8));
            const width = right - left;
            const height = bottom - top;
            if (width < 4 || height < 4) return null;

            const samples: Rgb[] = [];
            const columns = 7;
            const rows = 5;

            for (let row = 0; row < rows; row += 1) {
                for (let column = 0; column < columns; column += 1) {
                    const x = Math.round(left + (width * column) / (columns - 1));
                    const y = Math.round(top + (height * row) / (rows - 1));
                    const pixel = context.getImageData(x, y, 1, 1).data;
                    samples.push({
                        r: pixel[0],
                        g: pixel[1],
                        b: pixel[2],
                    });
                }
            }

            const foregroundIsLight = luminance(foreground) >= 0.45;
            samples.sort((a, b) =>
                foregroundIsLight
                    ? luminance(a) - luminance(b)
                    : luminance(b) - luminance(a),
            );

            const selected = samples.slice(0, Math.max(1, Math.ceil(samples.length * 0.25)));
            const background = selected.reduce<Rgb>(
                (total, sample) => ({
                    r: total.r + sample.r,
                    g: total.g + sample.g,
                    b: total.b + sample.b,
                }),
                { r: 0, g: 0, b: 0 },
            );
            background.r = Math.round(background.r / selected.length);
            background.g = Math.round(background.g / selected.length);
            background.b = Math.round(background.b / selected.length);

            return {
                background,
                ratio: contrastRatio(foreground, background),
            };
        }

        const failures: Failure[] = [];

        for (const element of Array.from(document.querySelectorAll(".readable-on-image"))) {
            if (!(element instanceof HTMLElement)) continue;
            const text = textFor(element);
            if (!text) continue;
            if (!isVisibleInViewport(element)) continue;

            const style = getComputedStyle(element);
            const color = parseCssColor(style.color);
            const protection = element.closest(".readable-label-stack");
            const hasProtection = protection instanceof HTMLElement;
            const hasLocalShield = hasProtection && hasPseudoShield(protection);
            const hasEdgeGradient = hasRelevantEdgeGradient(element);
            const usesReadableLightText = Boolean(
                color && color.r >= 220 && color.g >= 220 && color.b >= 220,
            );
            const sample = color ? sampleProtectedRegion(element, color) : null;
            const ratio = sample ? Number(sample.ratio.toFixed(2)) : null;
            const sampledBackground = sample
                ? `rgb(${sample.background.r}, ${sample.background.g}, ${sample.background.b})`
                : null;

            if (
                !hasProtection ||
                !hasLocalShield ||
                !hasEdgeGradient ||
                !usesReadableLightText ||
                !ratio ||
                ratio < 3
            ) {
                failures.push({
                    text: text.slice(0, 80),
                    selector: elementLabel(element),
                    color: style.color,
                    hasProtection,
                    hasLocalShield,
                    hasEdgeGradient,
                    ratio,
                    sampledBackground,
                });
            }
        }

        return failures;
    }, `data:image/png;base64,${screenshot.toString("base64")}`);

    expect(
        failures,
        failures
            .map(
                (failure) =>
                    `${failure.selector} "${failure.text}" image text uses ${failure.color}; protected=${failure.hasProtection}; shield=${failure.hasLocalShield}; edgeGradient=${failure.hasEdgeGradient}; regionalContrast=${failure.ratio}; sampled=${failure.sampledBackground}`,
            )
            .join("\n"),
    ).toEqual([]);
}

async function assertNavigationActionRowsDoNotOverlap(page: Page) {
    const failures = await page.evaluate(() => {
        type Rect = {
            left: number;
            top: number;
            right: number;
            bottom: number;
            width: number;
            height: number;
        };

        function toRect(element: Element): Rect {
            const rect = element.getBoundingClientRect();
            return {
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                width: rect.width,
                height: rect.height,
            };
        }

        function overlapArea(a: Rect, b: Rect) {
            const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
            const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
            return width * height;
        }

        function labelFor(element: HTMLElement) {
            return element.getAttribute("title") ?? element.textContent?.trim() ?? element.tagName;
        }

        const failures: Array<{
            card: string;
            edit: Rect;
            shortcut: Rect;
            shortcutLabel: string;
            overlap: number;
        }> = [];

        for (const card of Array.from(document.querySelectorAll(".dashboard-card-surface"))) {
            if (!(card instanceof HTMLElement)) continue;
            const edit = card.querySelector(".touch-edit-control");
            if (!(edit instanceof HTMLElement)) continue;

            const shortcuts = Array.from(card.querySelectorAll("button[title]"))
                .filter((button): button is HTMLElement => button instanceof HTMLElement)
                .filter((button) => button !== edit)
                .filter((button) => {
                    const title = button.getAttribute("title") ?? "";
                    return title.includes(".");
                });

            if (shortcuts.length === 0) continue;

            const editRect = toRect(edit);
            for (const shortcut of shortcuts) {
                const shortcutRect = toRect(shortcut);
                const overlap = overlapArea(editRect, shortcutRect);

                if (overlap > 1) {
                    failures.push({
                        card: card.textContent?.replace(/\s+/g, " ").trim().slice(0, 80) ?? "card",
                        edit: editRect,
                        shortcut: shortcutRect,
                        shortcutLabel: labelFor(shortcut),
                        overlap: Number(overlap.toFixed(1)),
                    });
                }
            }
        }

        return failures.slice(0, 8);
    });

    expect(
        failures,
        failures
            .map(
                (failure) =>
                    `${failure.card}: edit control overlaps ${failure.shortcutLabel} by ${failure.overlap}px2`,
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

    test("library navigation examples keep image labels readable and actions separated", async ({
        page,
    }, testInfo) => {
        await page.setViewportSize({ width: 390, height: 844 });
        const failedResponses = await collectLocalFailures(page);

        await page.goto(`${ingressBase}/library`);
        await page.getByRole("tab", { name: "Navigation" }).click();
        await expect(page.getByRole("heading", { name: "Navigation Cards" })).toBeVisible();

        await page.getByText("Image navigation").scrollIntoViewIfNeeded();
        await expect(page.getByTitle("light.library_accent")).toBeAttached();

        await assertNoPageHorizontalOverflow(page);
        await assertNavigationActionRowsDoNotOverlap(page);
        await assertImageTextProtection(page);
        await attachScreenshot(page, testInfo, "phone-library-navigation");

        expect(failedResponses).toEqual([]);
    });
});
