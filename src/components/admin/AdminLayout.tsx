import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AdminSidebar from "./AdminSidebar";

const AdminLayout = () => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-lg">Yükleniyor...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;