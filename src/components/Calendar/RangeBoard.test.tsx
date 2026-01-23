/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RangeBoard } from './RangeBoard';
import { formatDate } from '../../utils/dateUtils';
import { useCalendarStore } from '../../store/calendarStore';

vi.mock('../../store/calendarStore', () => ({
    useCalendarStore: vi.fn()
}));

const mockedUseCalendarStore = useCalendarStore as unknown as vi.Mock;

const buildRangeState = (overrides: Record<string, unknown> = {}) => {
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 0, 2);
    const sourceDate = formatDate(start);
    return {
        selection: { start, end },
        events: {
            [sourceDate]: [
                {
                    id: 'event-1',
                    title: 'Draft itinerary',
                    date: sourceDate,
                    startTime: '09:00',
                    priority: 2,
                    note: null,
                    link: null,
                    originDates: null,
                    wasPostponed: true
                }
            ]
        },
        viewMode: 'self',
        addEventsBulk: vi.fn().mockResolvedValue(true),
        editEvent: vi.fn().mockResolvedValue(undefined),
        addPostponedEventsBulk: vi.fn().mockResolvedValue(true),
        deleteEvent: vi.fn().mockResolvedValue(undefined),
        ...overrides
    };
};

beforeEach(() => {
    mockedUseCalendarStore.mockReset();
});

afterEach(() => {
    cleanup();
});

describe('RangeBoard', () => {
    it('does not delete events when postponing a move fails', async () => {
        const addPostponedEventsBulk = vi.fn().mockResolvedValue(false);
        const deleteEvent = vi.fn().mockResolvedValue(undefined);
        mockedUseCalendarStore.mockReturnValue(
            buildRangeState({
                addPostponedEventsBulk,
                deleteEvent
            })
        );

        const user = userEvent.setup();
        render(<RangeBoard activeDate={new Date(2026, 0, 1)} />);

        await user.click(screen.getAllByRole('checkbox')[0]);
        await user.selectOptions(screen.getByLabelText('Action'), 'move');
        await user.click(screen.getByRole('button', { name: 'Move to Postponed' }));

        expect(addPostponedEventsBulk).toHaveBeenCalled();
        expect(deleteEvent).not.toHaveBeenCalled();
    });

    it('preserves wasPostponed when copying across dates', async () => {
        const addEventsBulk = vi.fn().mockResolvedValue(true);
        mockedUseCalendarStore.mockReturnValue(
            buildRangeState({
                addEventsBulk
            })
        );

        const targetDate = formatDate(new Date(2026, 0, 2));
        const user = userEvent.setup();
        render(<RangeBoard activeDate={new Date(2026, 0, 1)} />);

        await screen.findByDisplayValue(targetDate);
        await user.click(screen.getAllByRole('checkbox')[0]);
        await user.click(screen.getByRole('button', { name: 'Copy Selected' }));

        expect(addEventsBulk).toHaveBeenCalledTimes(1);
        const payload = addEventsBulk.mock.calls[0][0];
        expect(payload[0].wasPostponed).toBe(true);
    });
});
