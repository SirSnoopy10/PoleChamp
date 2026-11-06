import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '../../test-utils/render';
import { CriterionCard } from '../scoring/CriterionCard';

const props = { id: 'k1', name: 'Technika', weightTenths: 20, scaleMax: 10, value: 50, onChange: () => {} };

describe('CriterionCard (IMP-751)', () => {
  it('UX2-09, UX2-17: skala zawsze widoczna, „nieruszone” osobno, nazwa do 2 linii', async () => {
    await renderWithProviders(<CriterionCard {...props} untouched />);
    expect(screen.getByText('/10', { exact: false })).toBeOnTheScreen();
    expect(screen.getByTestId('criterion-k1-untouched')).toHaveTextContent('nieruszone');
    expect(screen.getByTestId('criterion-k1-value')).toHaveTextContent('5,0');
    expect(screen.getByText('Technika').props.numberOfLines).toBe(2);
  });

  it('po zmianie podpis „nieruszone” zostaje niewidoczny – karta nie zmienia wysokości (próba turnieju)', async () => {
    await renderWithProviders(<CriterionCard {...props} untouched={false} />);
    expect(screen.queryByTestId('criterion-k1-untouched')).toBeNull();
    expect(screen.queryByText('nieruszone')).toBeNull();
    const reserved = screen.getByText('nieruszone', { includeHiddenElements: true });
    expect(reserved).toHaveStyle({ opacity: 0 });
  });
});
