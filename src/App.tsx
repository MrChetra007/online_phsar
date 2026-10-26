import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AdminCategoriesPage } from './features/admin/AdminCategoriesPage'
import { AdminDisputesPage } from './features/admin/AdminDisputesPage'
import { AdminOrderDetailPage } from './features/admin/AdminOrderDetailPage'
import { AdminOrdersPage } from './features/admin/AdminOrdersPage'
import { AdminPage } from './features/admin/AdminPage'
import { AdminPaymentsPage } from './features/admin/AdminPaymentsPage'
import { AdminSettingsPage } from './features/admin/AdminSettingsPage'
import { AdminSettlementsPage } from './features/admin/AdminSettlementsPage'
import { LoginPage } from './features/auth/LoginPage'
import { RequireAuth } from './features/auth/RequireAuth'
import { RequireRole } from './features/auth/RequireRole'
import { SignUpPage } from './features/auth/SignUpPage'
import { ProductEditorPage } from './features/store-dashboard/ProductEditorPage'
import { StoreDashboardPage } from './features/store-dashboard/StoreDashboardPage'
import { StoreOrderDetailPage } from './features/store-dashboard/StoreOrderDetailPage'
import { StoreOrdersPage } from './features/store-dashboard/StoreOrdersPage'
import { StoreStatementPage } from './features/store-dashboard/StoreStatementPage'
import { CheckoutPage } from './features/checkout/CheckoutPage'
import { CartPage } from './pages/CartPage'
import { CategoryPage } from './pages/CategoryPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OrderConfirmationPage } from './pages/OrderConfirmationPage'
import { PaymentPage } from './pages/PaymentPage'
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
        <Route path="pay/:orderCode" element={<PaymentPage />} />
        <Route path="track" element={<TrackingPage />} />
        <Route path="c/:slug" element={<CategoryPage />} />
        <Route path="p/:productId" element={<ProductPage />} />
        <Route path="s/:slug" element={<PublicStorePage />} />

        <Route element={<RequireAuth />}>
          <Route element={<RequireRole role="store_owner" />}>
            <Route path="store" element={<StoreDashboardPage />} />
            <Route path="store/orders" element={<StoreOrdersPage />} />
            <Route
              path="store/orders/:orderId"
              element={<StoreOrderDetailPage />}
            />
            <Route path="store/statement" element={<StoreStatementPage />} />
            <Route path="store/products/new" element={<ProductEditorPage />} />
            <Route
              path="store/products/:productId"
              element={<ProductEditorPage />}
            />
          </Route>
          <Route element={<RequireRole role="super_admin" />}>
            <Route path="admin" element={<AdminPage />} />
            <Route path="admin/orders" element={<AdminOrdersPage />} />
            <Route
              path="admin/orders/:orderId"
              element={<AdminOrderDetailPage />}
            />
            <Route path="admin/payments" element={<AdminPaymentsPage />} />
            <Route path="admin/disputes" element={<AdminDisputesPage />} />
            <Route
              path="admin/settlements"
              element={<AdminSettlementsPage />}
            />
            <Route path="admin/settings" element={<AdminSettingsPage />} />
            <Route path="admin/categories" element={<AdminCategoriesPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
