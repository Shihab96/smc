// app/layout.js

import './globals.css';

export const metadata = {
  title: 'Liquidity Sweep Trader - XAU/USD Institutional Analysis',
  description: 'Advanced liquidity sweep and impulse detection for Gold trading',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
