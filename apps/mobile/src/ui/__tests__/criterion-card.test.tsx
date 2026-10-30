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
});
