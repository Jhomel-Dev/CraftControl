import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { ThemeProvider } from "@/shared/theme/ThemeProvider";
import { GoogleAuthProvider } from "@/shared/providers/GoogleAuthProvider";
import { ToastProvider } from "@/shared/ui/ToastProvider";
import "./globals.css";

export const metadata = {
  title: "Minecraft Server Manager",
  description: "Advanced, modern and blocky Minecraft server manager panel",
};

export default async function RootLayout({ children }) {
  const messages = await getMessages();
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {process.env.NODE_ENV === 'development' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if (typeof window !== 'undefined') {
                  const observer = new MutationObserver((mutations) => {
                    mutations.forEach((m) => {
                      if (m.type === 'attributes' && m.attributeName === 'bis_skin_checked') {
                        m.target.removeAttribute('bis_skin_checked');
                      }
                      if (m.type === 'attributes' && m.attributeName === 'bis_register') {
                        m.target.removeAttribute('bis_register');
                      }
                    });
                  });
                  observer.observe(document.documentElement, { attributes: true, subtree: true });
                }
              `,
            }}
          />
        )}
      </head>
      <body className="antialiased min-h-screen" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <GoogleAuthProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </GoogleAuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
