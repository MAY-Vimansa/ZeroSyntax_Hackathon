import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import {
  DEFAULT_THEME,
  parseTheme,
  THEME_BOOTSTRAP,
  THEME_COOKIE,
} from "@/lib/theme";
import { Provider } from "@/components/provider";
import { Shell } from "@/components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "FlexiRova — Find work nearby. Hire smarter.",
    template: "%s | FlexiRova",
  },
  description:
    "Discover flexible local shifts in Sri Lanka. Clear wages, simple applications, and a better way to hire.",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialTheme =
    parseTheme((await cookies()).get(THEME_COOKIE)?.value) ?? DEFAULT_THEME;
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      data-theme={initialTheme}
      style={{ colorScheme: initialTheme }}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>
        <Provider initialTheme={initialTheme}>
          <Suspense fallback={<div className="loading">FlexiRova…</div>}>
            <Shell>{children}</Shell>
          </Suspense>
        </Provider>
      </body>
    </html>
  );
}
