import { fireEvent, renderWithProviders, screen, waitFor } from '../../../test-utils/render';
import { CategoryActionBar } from '../../org/CategoryActionBar';
import { CategoryFormSheet } from '../CategoryFormSheet';

describe('kategoria (IMP-753, IMP-758)', () => {
  it('UX2-04: start wyłączony przy brakach', async () => {
    await renderWithProviders(
      <CategoryActionBar category="DRAFT" tournament="IN_PROGRESS" onAction={() => {}} startBlocked />,
    );
    expect(screen.getByTestId('category-action-start')).toBeDisabled();
  });

  it('UX2-21, UX2-34: styl i poziom wymagane, nazwa podpowiedziana z wyboru', async () => {
    const onCreate = jest.fn().mockResolvedValue(undefined);
    await renderWithProviders(<CategoryFormSheet visible onClose={() => {}} canWrite onCreate={onCreate} />);
    await fireEvent.changeText(screen.getByTestId('category-name'), 'Moja');
    await fireEvent.press(screen.getByTestId('category-submit'));
    expect(await screen.findAllByText('Wybierz jedną z opcji.')).toHaveLength(2);
    expect(onCreate).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('category-name'), '');
    await fireEvent.press(screen.getByText('Exotic'));
    await fireEvent.press(screen.getByText('Pro'));
    await waitFor(() => expect(screen.getByTestId('category-name').props.value).toBe('Exotic Pro'));
  });
});
