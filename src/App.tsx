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
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PublicStorePage } from './pages/PublicStorePage'

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignUpPage />} />
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
