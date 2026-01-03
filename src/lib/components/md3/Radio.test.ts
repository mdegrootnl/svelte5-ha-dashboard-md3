import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import Radio from './Radio.svelte';

describe('Radio Component', () => {
    it('is checked when value matching group', () => {
        render(Radio, { props: { group: 'a', value: 'a' } });
        const input = screen.getByRole('radio') as HTMLInputElement;
        expect(input.checked).toBe(true);
    });

    it('is unchecked when value does not match group', () => {
        render(Radio, { props: { group: 'b', value: 'a' } });
        const input = screen.getByRole('radio') as HTMLInputElement;
        expect(input.checked).toBe(false);
    });

    it('updates group on click', async () => {
        const onchange = vi.fn();
        let group = 'b';
        render(Radio, { props: { group, value: 'a', onchange } });

        await fireEvent.click(screen.getByRole('radio'));
        expect(onchange).toHaveBeenCalledWith('a');
    });

    it('does not change when disabled', async () => {
        const onchange = vi.fn();
        render(Radio, { props: { group: 'b', value: 'a', disabled: true, onchange } });

        await fireEvent.click(screen.getByRole('radio'));
        expect(onchange).not.toHaveBeenCalled();
    });

    it('renders multiple radios in a group correctly', () => {
        render(Radio, { props: { group: 'a', value: 'a' } });
        render(Radio, { props: { group: 'a', value: 'b' } });

        const radios = screen.getAllByRole('radio') as HTMLInputElement[];
        expect(radios[0].checked).toBe(true);
        expect(radios[1].checked).toBe(false);
    });
});
