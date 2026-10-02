/** JSON data inside a script element must not contain HTML closing tags. */
export function serializeJsonLd(value: unknown): string {
	return JSON.stringify(value).replace(/</g, '\\u003c');
}
