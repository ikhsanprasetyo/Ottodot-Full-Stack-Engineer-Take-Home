import { render, screen } from '@testing-library/react';

describe('Sample Test', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2);
  });

  it('renders a heading', () => {
    render(<h1>Hello Jest</h1>);
    const heading = screen.getByText(/hello jest/i);
    expect(heading).toBeInTheDocument();
  });
});
