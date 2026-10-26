import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AdminCategoriesPage } from './features/admin/AdminCategoriesPage'
import { AdminPage } from './features/admin/AdminPage'
import { LoginPage } from './features/auth/LoginPage'
import { RequireAuth } from './features/auth/RequireAuth'
import { RequireRole } from './features/auth/RequireRole'
import { SignUpPage } from './features/auth/SignUpPage'
import { ProductEditorPage } from './features/store-dashboard/ProductEditorPage'
import { StoreDashboardPage } from './features/store-dashboard/StoreDashboardPage'
import { CheckoutPage } from './features/checkout/CheckoutPage'
import { CartPage } from './pages/CartPage'
import { CategoryPage } from './pages/CategoryPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OrderConfirmationPage } from './pages/OrderConfirmationPage'
import { ProductPage } from './pages/ProductPage'
import { PublicStorePage } from './pages/PublicStorePage'
import { SearchPage } from './pages/SearchPage'
import { TrackingPage } from './pages/TrackingPage'

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignUpPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="order/:orderCode" element={<OrderConfirmationPage />} />
        <Route path="track" element={<TrackingPage />} />
        <Route path="c/:slug" element={<CategoryPage />} />
        <Route path="p/:productId" element={<ProductPage />} />
        <Route path="s/:slug" element={<PublicStorePage />} />

        <Route element={<RequireAuth />}>
          <Route element={<RequireRole role="store_owner" />}>
            <Route path="store" element={<StoreDashboardPage />} />
            <Route path="store/products/new" element={<ProductEditorPage />} />
            <Route
              path="store/products/:productId"
              element={<ProductEditorPage />}
            />
          </Route>
          <Route element={<RequireRole role="super_admin" />}>
            <Route path="admin" element={<AdminPage />} />
            <Route path="admin/categories" element={<AdminCategoriesPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
