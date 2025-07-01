import { render, screen, fireEvent } from '@testing-library/react';
import { PaymentPlanSelector } from '@/components/features/payment-plan-selector';

describe('PaymentPlanSelector', () => {
  const mockOnSelect = jest.fn();
  const testAmount = 300;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all payment plans', () => {
    render(<PaymentPlanSelector amount={testAmount} onSelect={mockOnSelect} />);

    expect(screen.getByText('Pay in 2')).toBeInTheDocument();
    expect(screen.getByText('Pay in 3')).toBeInTheDocument();
    expect(screen.getByText('Pay in 4')).toBeInTheDocument();
  });

  it('displays correct installment amounts', () => {
    render(<PaymentPlanSelector amount={testAmount} onSelect={mockOnSelect} />);

    expect(screen.getByText(/2x \$150\.00/)).toBeInTheDocument();
    expect(screen.getByText(/3x \$100\.00/)).toBeInTheDocument();
    expect(screen.getByText(/4x \$75\.00/)).toBeInTheDocument();
  });

  it('selects Pay in 3 by default', () => {
    render(<PaymentPlanSelector amount={testAmount} onSelect={mockOnSelect} />);

    const payIn3Radio = screen.getByRole('radio', { name: /pay in 3/i });
    expect(payIn3Radio).toBeChecked();
  });

  it('calls onSelect when plan is changed', () => {
    render(<PaymentPlanSelector amount={testAmount} onSelect={mockOnSelect} />);

    const payIn2Radio = screen.getByRole('radio', { name: /pay in 2/i });
    fireEvent.click(payIn2Radio);

    expect(mockOnSelect).toHaveBeenCalledWith({
      id: 'pay_in_2',
      name: 'Pay in 2',
      installments: 2,
      description: 'Split into 2 interest-free payments',
    });
  });

  it('updates visual selection indicator', () => {
    const { container } = render(
      <PaymentPlanSelector amount={testAmount} onSelect={mockOnSelect} />,
    );

    const payIn4Radio = screen.getByRole('radio', { name: /pay in 4/i });
    fireEvent.click(payIn4Radio);

    const selectedCard = container.querySelector('.border-purple-600');
    expect(selectedCard).toBeInTheDocument();
  });
});
