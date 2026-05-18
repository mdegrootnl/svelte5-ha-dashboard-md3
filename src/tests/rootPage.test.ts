import { describe, expect, it } from 'vitest';
import { load } from '../routes/+page';

describe('root page', () => {
	it('redirects the initial landing page to the dashboard', () => {
		try {
			load();
			throw new Error('Expected root load to redirect');
		} catch (error) {
			expect(error).toMatchObject({
				status: 307,
				location: '/dashboard',
			});
		}
	});
});
