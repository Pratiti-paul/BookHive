import DashboardLayout from "../../layouts/DashboardLayout";
import PageContainer from "../../components/common/PageContainer";

function AdminDashboard() {
  return (
    <DashboardLayout><PageContainer>
      <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Manage libraries, librarians and analytics.
      </p>
    </PageContainer></DashboardLayout>
  );
}

export default AdminDashboard;
