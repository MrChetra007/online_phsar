import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { RequireAuth } from './features/auth/RequireAuth'
import { RequireRole } from './features/auth/RequireRole'
import { HomePage } from './pages/HomePage'

const AdminCategoriesPage = lazy(() =>
  import('./features/admin/AdminCategoriesPage').then((module) => ({
    default: module.AdminCategoriesPage,
  })),
)
const AdminDisputesPage = lazy(() =>
  import('./features/admin/AdminDisputesPage').then((module) => ({
    default: module.AdminDisputesPage,
  })),
)
const AdminLayout = lazy(() =>
  import('./features/admin/AdminLayout').then((module) => ({
    default: module.AdminLayout,
  })),
)
const AdminOrderDetailPage = lazy(() =>
  import('./features/admin/AdminOrderDetailPage').then((module) => ({
    default: module.AdminOrderDetailPage,
  })),
)
const AdminOrdersPage = lazy(() =>
  import('./features/admin/AdminOrdersPage').then((module) => ({
    default: module.AdminOrdersPage,
  })),
)
const AdminPage = lazy(() =>
  import('./features/admin/AdminPage').then((module) => ({
    default: module.AdminPage,
  })),
)
const AdminPaymentsPage = lazy(() =>
  import('./features/admin/AdminPaymentsPage').then((module) => ({
    default: module.AdminPaymentsPage,
  })),
)
const AdminSettingsPage = lazy(() =>
  import('./features/admin/AdminSettingsPage').then((module) => ({
    default: module.AdminSettingsPage,
  })),
)
const AdminSettlementsPage = lazy(() =>
  import('./features/admin/AdminSettlementsPage').then((module) => ({
    default: module.AdminSettlementsPage,
  })),
)
const LoginPage = lazy(() =>
  import('./features/auth/LoginPage').then((module) => ({
    default: module.LoginPage,
  })),
)
const SignUpPage = lazy(() =>
  import('./features/auth/SignUpPage').then((module) => ({
    default: module.SignUpPage,
  })),
)
const CheckoutPage = lazy(() =>
  import('./features/checkout/CheckoutPage').then((module) => ({
    default: module.CheckoutPage,
  })),
)
const ProductEditorPage = lazy(() =>
  import('./features/store-dashboard/ProductEditorPage').then((module) => ({
    default: module.ProductEditorPage,
  })),
)
const StoreDashboardPage = lazy(() =>
  import('./features/store-dashboard/StoreDashboardPage').then((module) => ({
    default: module.StoreDashboardPage,
  })),
)
const StoreLayout = lazy(() =>
  import('./features/store-dashboard/StoreLayout').then((module) => ({
    default: module.StoreLayout,
  })),
)
const StoreOrderDetailPage = lazy(() =>
  import('./features/store-dashboard/StoreOrderDetailPage').then((module) => ({
    default: module.StoreOrderDetailPage,
  })),
)
const StoreOrdersPage = lazy(() =>
  import('./features/store-dashboard/StoreOrdersPage').then((module) => ({
    default: module.StoreOrdersPage,
  })),
)
const StoreProductsPage = lazy(() =>
  import('./features/store-dashboard/StoreProductsPage').then((module) => ({
    default: module.StoreProductsPage,
  })),
)
const StoreSettingsPage = lazy(() =>
  import('./features/store-dashboard/StoreSettingsPage').then((module) => ({
    default: module.StoreSettingsPage,
  })),
)
const StoreStatementPage = lazy(() =>
  import('./features/store-dashboard/StoreStatementPage').then((module) => ({
    default: module.StoreStatementPage,
  })),
)
const CartPage = lazy(() =>
  import('./pages/CartPage').then((module) => ({
    default: module.CartPage,
  })),
)
const CategoryPage = lazy(() =>
  import('./pages/CategoryPage').then((module) => ({
    default: module.CategoryPage,
  })),
)
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((module) => ({
    default: module.NotFoundPage,
  })),
)
const OrderConfirmationPage = lazy(() =>
  import('./pages/OrderConfirmationPage').then((module) => ({
    default: module.OrderConfirmationPage,
  })),
)
const PaymentPage = lazy(() =>
  import('./pages/PaymentPage').then((module) => ({
    default: module.PaymentPage,
  })),
)
const ProductPage = lazy(() =>
  import('./pages/ProductPage').then((module) => ({
    default: module.ProductPage,
  })),
)
const PublicStorePage = lazy(() =>
  import('./pages/PublicStorePage').then((module) => ({
    default: module.PublicStorePage,
  })),
)
const SearchPage = lazy(() =>
  import('./pages/SearchPage').then((module) => ({
    default: module.SearchPage,
  })),
)
const TrackingPage = lazy(() =>
  import('./pages/TrackingPage').then((module) => ({
    default: module.TrackingPage,
  })),
)

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

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<RequireRole role="super_admin" />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="orders/:orderId" element={<AdminOrderDetailPage />} />
            <Route path="payments" element={<AdminPaymentsPage />} />
            <Route path="disputes" element={<AdminDisputesPage />} />
            <Route path="settlements" element={<AdminSettlementsPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<RequireRole role="store_owner" />}>
          <Route path="store" element={<StoreLayout />}>
            <Route index element={<StoreDashboardPage />} />
            <Route path="orders" element={<StoreOrdersPage />} />
            <Route path="orders/:orderId" element={<StoreOrderDetailPage />} />
            <Route path="products" element={<StoreProductsPage />} />
            <Route path="products/new" element={<ProductEditorPage />} />
            <Route path="products/:productId" element={<ProductEditorPage />} />
            <Route path="statement" element={<StoreStatementPage />} />
            <Route path="settings" element={<StoreSettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}

export default App
