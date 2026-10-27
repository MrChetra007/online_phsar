import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/noto-sans-khmer/400.css'
import '@fontsource/noto-sans-khmer/500.css'
import '@fontsource/noto-sans-khmer/600.css'
import '@fontsource/noto-sans-khmer/700.css'
import './index.css'
import App from './App.tsx'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { AuthProvider } from './features/auth'
import { CartProvider } from './features/cart'
import { ToastProvider } from './features/toast'
import { I18nProvider } from './lib/i18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <AppErrorBoundary>
        <AuthProvider>
          <CartProvider>
            <BrowserRouter>
              <ToastProvider>
                <App />
              </ToastProvider>
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </AppErrorBoundary>
    </I18nProvider>
  </StrictMode>,
)
