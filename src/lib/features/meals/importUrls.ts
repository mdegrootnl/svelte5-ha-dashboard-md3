export function parseRecipeImportUrls(input: string) {
    const seen = new Set<string>();
    const matches = input.match(/https?:\/\/[^\s<>"']+/gi) ?? [];

    return matches
        .map((url) => url.replace(/[),.;\]]+$/g, ""))
        .filter((url) => {
            try {
                const parsed = new URL(url);
                return parsed.protocol === "http:" || parsed.protocol === "https:";
            } catch {
                return false;
            }
        })
        .filter((url) => {
            if (seen.has(url)) return false;
            seen.add(url);
            return true;
        });
}
