import { describe, expect, it } from 'vitest';
import { serializeJsonLd } from './serialize-jsonld';

describe('JSON-LD script boundary', () => {
	it.each(['</script><script>window.injected=true</script>', '</ScRiPt><img src=x onerror=alert(1)>', '<!--<script>'])('keeps %s inside the JSON data', (payload) => {
		const original = { description: payload, name: 'Product' };
		const encoded = serializeJsonLd(original);
		expect(encoded).not.toContain('<');
		expect(JSON.parse(encoded)).toEqual(original);
	});
	it('preserves ordinary Jodit tables, formatting, Unicode and links', () => {
		const description = '<h2>বাংলা</h2><table><tr><td><strong>Details & sizes</strong></td></tr></table>';
		expect(JSON.parse(serializeJsonLd({ description }))).toEqual({ description });
	});
});
