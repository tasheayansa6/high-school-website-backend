import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SafeHtml } from '@/components/content/SafeHtml';

describe('SafeHtml', () => {
  it('renders allowed markup', () => {
    render(<SafeHtml html="<p>Campus <strong>news</strong></p>" />);
    expect(screen.getByText('Campus')).toBeInTheDocument();
    expect(screen.getByText('news')).toBeInTheDocument();
  });

  it('strips script tags and event handlers', () => {
    const { container } = render(
      <SafeHtml
        html={`<p onclick="alert(1)">Hello</p><script>window.evil=1</script><img src=x onerror=alert(1)>`}
      />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML.toLowerCase()).not.toContain('onclick');
    expect(container.innerHTML.toLowerCase()).not.toContain('onerror');
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('blocks javascript: URLs in anchors', () => {
    const { container } = render(<SafeHtml html={`<a href="javascript:alert(1)">Click</a>`} />);
    const anchor = container.querySelector('a');
    expect(anchor).toBeTruthy();
    expect(anchor?.getAttribute('href') ?? '').not.toMatch(/^javascript:/i);
  });
});
