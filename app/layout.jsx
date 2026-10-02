import './globals.css';

export const metadata = {
  title: 'SPECTER // Autonomous Instagram OSINT & Behavioral Intelligence',
  description: 'Deep multi-modal Instagram intelligence, behavioral profiling, reels forensic matrix, and highlights extraction engine.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
