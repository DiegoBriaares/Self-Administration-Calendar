/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostponedRangeBoard } from './PostponedRangeBoard';
import { useCalendarStore } from '../../store/calendarStore';

vi.mock('../../store/calendarStore', () => ({
    useCalendarStore: vi.fn()
}));

const mockedUseCalendarStore = useCalendarStore as unknown as vi.Mock;

const buildPostponedState = (overrides: Record<string, unknown> = {}) => ({
    postponedEvents: [
        {
            id: 'postponed-1',
            title: 'Reschedule',
            date: '',
            startTime: '10:00',
            priority: 1,
            note: null,
            link: null,
            originDates: null,
            wasPostponed: null
        }
    ],
    viewMode: 'self',
    addEventsBulk: vi.fn().mockResolvedValue(true),
    deletePostponedEvent: vi.fn().mockResolvedValue(undefined),
    ...overrides
});

beforeEach(() => {
    mockedUseCalendarStore.mockReset();
});

describe('PostponedRangeBoard', () => {
    it('does not delete postponed items when moving fails', async () => {
        const addEventsBulk = vi.fn().mockResolvedValue(false);
        const deletePostponedEvent = vi.fn().mockResolvedValue(undefined);
        mockedUseCalendarStore.mockReturnValue(
            buildPostponedState({
                addEventsBulk,
                deletePostponedEvent
            })
        );

        const user = userEvent.setup();
        const { container } = render(<PostponedRangeBoard />);
        const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;

        fireEvent.change(dateInput, { target: { value: '2026-01-02' } });
        await user.click(screen.getByRole('checkbox'));
        await user.selectOptions(screen.getByLabelText('Action'), 'move');
        await user.click(screen.getByRole('button', { name: 'Move Selected' }));

        expect(addEventsBulk).toHaveBeenCalled();
        expect(deletePostponedEvent).not.toHaveBeenCalled();
    });
});
