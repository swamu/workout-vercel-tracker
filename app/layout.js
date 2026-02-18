import './globals.css';

export const metadata = {
  title: 'Workout Progress Tracker',
  description: 'Track daily workout completion with local storage'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
