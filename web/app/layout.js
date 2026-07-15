import "./globals.css";

export const metadata = {
  title: "HumTrace AI",
  description: "Privacy-preserving UI foundation for possible report recommendations."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
