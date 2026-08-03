import "./globals.css";

export const metadata = {
  title: "HumTrace",
  description: "Report missing or unidentified people and review possible matches."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
