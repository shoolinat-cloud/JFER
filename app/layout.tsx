import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "@/components/LayoutWrapper";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  // --------------------------------------------------
  // SITE URL
  // --------------------------------------------------

  metadataBase: new URL("https://www.jfer.co.in"),

  // --------------------------------------------------
  // BASIC SITE INFORMATION
  // --------------------------------------------------

  title: {
    default: "JFER | Journal of Future Engineering and Research",
    template: "%s | JFER",
  },

  description:
    "Journal of Future Engineering and Research — a peer-reviewed journal for engineering, technology, and research.",

  applicationName: "JFER",

  // --------------------------------------------------
  // KEYWORDS
  // --------------------------------------------------

  keywords: [
    "JFER",
    "Journal of Future Engineering and Research",
    "engineering journal",
    "research journal",
    "peer reviewed journal",
    "engineering research",
    "technology research",
    "scientific journal",
  ],

  // --------------------------------------------------
  // AUTHOR / PUBLISHER
  // --------------------------------------------------

  authors: [
    {
      name: "Journal of Future Engineering and Research",
    },
  ],

  creator: "Journal of Future Engineering and Research",
  publisher: "Journal of Future Engineering and Research",

  // --------------------------------------------------
  // CANONICAL URL
  // --------------------------------------------------

  alternates: {
    canonical: "https://www.jfer.co.in",
  },

  // --------------------------------------------------
  // FAVICON / BRAND ICON
  // --------------------------------------------------

  icons: {
    icon: [
      {
        url: "/Journel_logo.png",
        type: "image/png",
      },
    ],

    shortcut: "/Journel_logo.png",

    apple: "/Journel_logo.png",
  },

  // --------------------------------------------------
  // OPEN GRAPH
  // --------------------------------------------------

  openGraph: {
    type: "website",

    siteName: "JFER",

    title: "JFER | Journal of Future Engineering and Research",

    description:
      "Journal of Future Engineering and Research — a peer-reviewed journal for engineering, technology, and research.",

    url: "https://www.jfer.co.in",

    locale: "en_US",

    images: [
      {
        url: "/Journel_logo.png",
        width: 512,
        height: 512,
        alt: "JFER - Journal of Future Engineering and Research",
      },
    ],
  },

  // --------------------------------------------------
  // TWITTER / X
  // --------------------------------------------------

  twitter: {
    card: "summary",

    title: "JFER | Journal of Future Engineering and Research",

    description:
      "Journal of Future Engineering and Research — a peer-reviewed journal for engineering, technology, and research.",

    images: ["/Journel_logo.png"],
  },

  // --------------------------------------------------
  // SEARCH ENGINE SETTINGS
  // --------------------------------------------------

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${nunito.variable} antialiased`}>
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
