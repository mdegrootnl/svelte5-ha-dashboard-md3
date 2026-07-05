import { AhSettingsService } from "$lib/server/ahSettings";
import type { AhProduct, AhReceiptProductLine, AhReceiptSummary, ShoppingExportItem } from "$lib/types/ah";

const AH_BASE_URL = "https://api.ah.nl";
const AH_CLIENT_ID = "appie";
const AH_CLIENT_VERSION = "9.28";
const AH_USER_AGENT = "Appie/9.28 (iPhone17,3; iPhone; CPU OS 26_1 like Mac OS X)";

interface AhTokenResponse {
    access_token?: string;
    refresh_token?: string;
    member_id?: string;
    expires_in?: number;
}

interface AhProductResponse {
    webshopId?: number;
    hqId?: number;
    title?: string;
    brand?: string;
    salesUnitSize?: string;
    unitPriceDescription?: string;
    images?: Array<{ url?: string; width?: number; height?: number }>;
    currentPrice?: number;
    priceBeforeBonus?: number;
    isBonus?: boolean;
    bonusMechanism?: string;
    availableOnline?: boolean;
    isOrderable?: boolean;
}

interface AhSearchResponse {
    products?: AhProductResponse[];
}

interface AhGraphqlResponse<T> {
    data?: T;
    errors?: Array<{ message?: string }>;
}

interface AhReceiptsGraphqlData {
    posReceiptsPage?: {
        posReceipts?: Array<{
            id?: string;
            dateTime?: string;
            totalAmount?: {
                amount?: number;
            };
        }>;
    };
}

interface AhReceiptDetailGraphqlData {
    posReceiptDetails?: {
        id?: string;
        products?: Array<{
            id?: number;
            quantity?: number;
            name?: string;
            amount?: {
                amount?: number;
            };
            price?: {
                amount?: number;
            } | null;
        }>;
    };
}

interface AhMemberGraphqlData {
    member?: {
        id?: number | string;
        emailAddress?: string;
        name?: {
            first?: string;
            last?: string;
        };
    };
}

export interface AhMember {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
}

const AH_MEMBER_QUERY = `query FetchMember {
    member {
        id
        emailAddress
        name {
            first
            last
        }
    }
}`;

const AH_RECEIPTS_QUERY = `query FetchPosReceipts($offset: Int!, $limit: Int!) {
    posReceiptsPage(pagination: {offset: $offset, limit: $limit}) {
        posReceipts {
            id
            dateTime
            totalAmount {
                amount
            }
        }
    }
}`;

const AH_RECEIPT_DETAIL_QUERY = `query FetchReceipt($id: String!) {
    posReceiptDetails(id: $id) {
        id
        products {
            id
            quantity
            name
            amount {
                amount
            }
            price {
                amount
            }
        }
    }
}`;

export class AhApiError extends Error {
    constructor(
        message: string,
        public status = 500,
    ) {
        super(message);
    }
}

function commonAhHeaders(accessToken?: string) {
    const headers: Record<string, string> = {
        "User-Agent": AH_USER_AGENT,
        "x-client-name": AH_CLIENT_ID,
        "x-client-version": AH_CLIENT_VERSION,
        "x-application": "AHWEBSHOP",
        accept: "application/json",
        "content-type": "application/json",
    };
    if (accessToken) headers.authorization = `Bearer ${accessToken}`;
    return headers;
}

function tokenIsFresh(expiresAt?: string) {
    if (!expiresAt) return true;
    return Date.now() < new Date(expiresAt).getTime() - 60_000;
}

async function parseError(response: Response) {
    const data = await response.json().catch(() => null);
    if (data && typeof data === "object") {
        const record = data as Record<string, unknown>;
        if (typeof record.message === "string") return record.message;
        if (typeof record.error === "string") return record.error;
        if (typeof record.code === "string") return record.code;
    }
    return `Albert Heijn API error: ${response.status}`;
}

export async function requestAh<T>({
    path,
    method = "GET",
    body,
    fetch,
    accessToken,
}: {
    path: string;
    method?: string;
    body?: unknown;
    fetch: typeof globalThis.fetch;
    accessToken?: string;
}) {
    const response = await fetch(new URL(path, AH_BASE_URL), {
        method,
        headers: commonAhHeaders(accessToken),
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: "manual",
    });

    if (!response.ok) {
        throw new AhApiError(await parseError(response), response.status);
    }

    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
}

export async function getAnonymousAhToken(fetch: typeof globalThis.fetch) {
    const token = await requestAh<AhTokenResponse>({
        path: "/mobile-auth/v1/auth/token/anonymous",
        method: "POST",
        body: { clientId: AH_CLIENT_ID },
        fetch,
    });
    if (!token.access_token) throw new AhApiError("Albert Heijn anonymous token was missing.", 502);
    return token.access_token;
}

export async function exchangeAhCode(code: string, fetch: typeof globalThis.fetch) {
    if (!code.trim()) throw new AhApiError("Albert Heijn login code is missing.", 400);
    const token = await requestAh<AhTokenResponse>({
        path: "/mobile-auth/v1/auth/token",
        method: "POST",
        body: { clientId: AH_CLIENT_ID, code },
        fetch,
    });
    if (!token.access_token) throw new AhApiError("Albert Heijn login did not return a token.", 502);
    await AhSettingsService.saveTokenResponse(token);
    return token;
}

export async function refreshAhAccessToken(fetch: typeof globalThis.fetch) {
    const runtime = await AhSettingsService.loadRuntime();
    if (!runtime.refreshToken) throw new AhApiError("Albert Heijn refresh token is missing.", 401);
    const token = await requestAh<AhTokenResponse>({
        path: "/mobile-auth/v1/auth/token/refresh",
        method: "POST",
        body: { clientId: AH_CLIENT_ID, refreshToken: runtime.refreshToken },
        fetch,
    });
    if (!token.access_token) throw new AhApiError("Albert Heijn token refresh did not return a token.", 401);
    await AhSettingsService.saveTokenResponse(token);
    return token.access_token;
}

export async function getAuthenticatedAhToken(fetch: typeof globalThis.fetch) {
    const runtime = await AhSettingsService.loadRuntime();
    if (runtime.accessToken && tokenIsFresh(runtime.expiresAt)) return runtime.accessToken;
    if (runtime.refreshToken) return refreshAhAccessToken(fetch);
    throw new AhApiError("Albert Heijn is not connected.", 401);
}

async function requestAuthenticatedAh<T>({
    path,
    method = "GET",
    body,
    fetch,
}: {
    path: string;
    method?: string;
    body?: unknown;
    fetch: typeof globalThis.fetch;
}) {
    const accessToken = await getAuthenticatedAhToken(fetch);
    try {
        return await requestAh<T>({ path, method, body, fetch, accessToken });
    } catch (error) {
        if (!(error instanceof AhApiError) || ![401, 403].includes(error.status)) {
            throw error;
        }

        let refreshedAccessToken: string;
        try {
            refreshedAccessToken = await refreshAhAccessToken(fetch);
        } catch {
            throw error;
        }

        return requestAh<T>({ path, method, body, fetch, accessToken: refreshedAccessToken });
    }
}

async function requestAuthenticatedAhGraphql<T>(
    fetch: typeof globalThis.fetch,
    query: string,
    variables: Record<string, unknown>,
) {
    const response = await requestAuthenticatedAh<AhGraphqlResponse<T>>({
        path: "/graphql",
        method: "POST",
        body: { query, variables },
        fetch,
    });
    if (response.errors?.length) {
        throw new AhApiError(response.errors[0]?.message || "Albert Heijn GraphQL request failed.", 502);
    }
    if (!response.data) throw new AhApiError("Albert Heijn GraphQL response was missing data.", 502);
    return response.data;
}

function formatAmount(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2).replace(".", ",") : undefined;
}

export async function getAhReceipts(
    fetch: typeof globalThis.fetch,
    limit = 12,
    accessToken?: string,
): Promise<AhReceiptSummary[]> {
    const cappedLimit = Math.min(Math.max(Math.round(limit) || 12, 1), 50);
    const request = {
        path: "/graphql",
        method: "POST",
        body: {
            query: AH_RECEIPTS_QUERY,
            variables: { offset: 0, limit: cappedLimit },
        },
        fetch,
    };
    const data = accessToken
        ? await requestAh<AhGraphqlResponse<AhReceiptsGraphqlData>>({ ...request, accessToken })
        : await requestAuthenticatedAh<AhGraphqlResponse<AhReceiptsGraphqlData>>(request);
    if (data.errors?.length) {
        throw new AhApiError(data.errors[0]?.message || "Albert Heijn receipts request failed.", 502);
    }
    const receipts = data.data?.posReceiptsPage?.posReceipts ?? [];
    return (receipts ?? [])
        .filter((receipt) => typeof receipt.id === "string" && receipt.id.trim())
        .slice(0, cappedLimit)
        .map((receipt) => ({
            transactionId: String(receipt.id),
            transactionMoment: receipt.dateTime,
            totalAmount: receipt.totalAmount?.amount,
            totalCurrency: "EUR",
        }));
}

export async function getAhReceiptProductLines(
    fetch: typeof globalThis.fetch,
    limit = 12,
): Promise<{ receipts: AhReceiptSummary[]; lines: AhReceiptProductLine[] }> {
    const receipts = await getAhReceipts(fetch, limit);
    const lines: AhReceiptProductLine[] = [];

    for (const receipt of receipts) {
        const detail = await requestAuthenticatedAhGraphql<AhReceiptDetailGraphqlData>(
            fetch,
            AH_RECEIPT_DETAIL_QUERY,
            { id: receipt.transactionId },
        );
        const receiptDetails = detail.posReceiptDetails;
        for (const item of receiptDetails?.products ?? []) {
            const description = typeof item.name === "string" ? item.name.trim() : "";
            if (!description) continue;
            lines.push({
                transactionId: receiptDetails?.id || receipt.transactionId,
                transactionMoment: receipt.transactionMoment,
                description,
                quantity: item.quantity,
                amount: formatAmount(item.amount?.amount),
            });
        }
    }

    return { receipts, lines };
}

export function mapAhProduct(product: AhProductResponse): AhProduct | null {
    const id = product.webshopId ?? product.hqId;
    if (!id || !product.title) return null;
    const image = product.images?.filter((current) => current.url).sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
    return {
        id,
        title: product.title,
        brand: product.brand,
        unitSize: product.salesUnitSize,
        unitPriceDescription: product.unitPriceDescription,
        price: {
            now: product.currentPrice || product.priceBeforeBonus || 0,
            was: product.priceBeforeBonus || undefined,
        },
        image: image?.url ? { url: image.url, width: image.width, height: image.height } : undefined,
        isBonus: Boolean(product.isBonus),
        bonusMechanism: product.bonusMechanism,
        isAvailable: product.availableOnline !== false,
        isOrderable: product.isOrderable !== false,
    };
}

export function mapAhMember(member: AhMemberGraphqlData["member"]): AhMember | null {
    if (!member) return null;
    const id = member.id === undefined || member.id === null ? undefined : String(member.id);
    const mapped = {
        id,
        firstName: member.name?.first,
        lastName: member.name?.last,
        email: member.emailAddress,
    };
    return mapped.id || mapped.email ? mapped : null;
}

export async function searchAhProducts(query: string, limit: number, fetch: typeof globalThis.fetch) {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const cappedLimit = Math.min(Math.max(limit || 8, 1), 30);
    let accessToken = "";

    try {
        accessToken = await getAuthenticatedAhToken(fetch);
    } catch {
        accessToken = await getAnonymousAhToken(fetch);
    }

    const params = new URLSearchParams({
        query: trimmed,
        page: "0",
        size: String(cappedLimit),
        sortOn: "RELEVANCE",
    });
    let data: AhSearchResponse;
    try {
        data = await requestAh<AhSearchResponse>({
            path: `/mobile-services/product/search/v2?${params.toString()}`,
            fetch,
            accessToken,
        });
    } catch (error) {
        if (!(error instanceof AhApiError) || ![401, 403].includes(error.status)) {
            throw error;
        }

        const anonymousAccessToken = await getAnonymousAhToken(fetch);
        data = await requestAh<AhSearchResponse>({
            path: `/mobile-services/product/search/v2?${params.toString()}`,
            fetch,
            accessToken: anonymousAccessToken,
        });
    }
    return (data.products ?? []).map(mapAhProduct).filter((product): product is AhProduct => Boolean(product));
}

export function ahShoppingPayload(items: ShoppingExportItem[]) {
    return {
        items: items.map((item) => ({
            description: item.mode === "product" ? item.product?.title || item.displayText : item.displayText,
            productId: item.mode === "product" ? item.productId : undefined,
            quantity: Math.max(1, Math.min(999, Math.round(item.quantity || 1))),
            type: "SHOPPABLE",
            originCode: "PRD",
            searchTerm: item.mode === "product" ? item.displayText : undefined,
            strikeThrough: false,
        })),
    };
}

export async function exportAhShoppingList(items: ShoppingExportItem[], fetch: typeof globalThis.fetch) {
    if (!items.length) throw new AhApiError("No shopping items were provided.", 400);
    await requestAuthenticatedAh<void>({
        path: "/mobile-services/shoppinglist/v2/items",
        method: "PATCH",
        body: ahShoppingPayload(items),
        fetch,
    });
}

export async function testAhConnection(fetch: typeof globalThis.fetch) {
    const response = await requestAuthenticatedAhGraphql<AhMemberGraphqlData>(fetch, AH_MEMBER_QUERY, {});
    const member = mapAhMember(response.member);
    if (!member) throw new AhApiError("Albert Heijn member profile was missing.", 502);
    return member;
}
