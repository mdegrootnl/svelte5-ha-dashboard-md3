import { expect, test } from "@playwright/test";

const ingressBase = "/api/hassio_ingress/test";

test.describe("global entity detail sheets", () => {
    test("open and dismiss from reusable cards outside the dashboard route", async ({ page }) => {
        await page.goto(`${ingressBase}/library`);

        await page.getByRole("tab", { name: "Specialist" }).click();
        const detailButton = page.getByTestId("entity-detail-open").first();
        await expect(detailButton).toBeAttached();

        await detailButton.click({ force: true });
        await expect(page.locator(".entity-detail")).toBeVisible();
        await expect(page.getByRole("dialog")).toContainText(/Controls|Attributes|Unavailable|Security|Locks/i);

        await page.keyboard.press("Escape");
        await expect(page.locator(".entity-detail")).toBeHidden();
    });
});
