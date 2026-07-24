import DashboardLayout from "../../layouts/DashboardLayout";
import PageContainer from "../../components/common/PageContainer";

function LibrarianDashboard() {
  return (
    <DashboardLayout><PageContainer>
      <h1 className="text-3xl font-bold text-gray-900">Librarian Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Manage books, students and borrow requests.
      </p>
    </PageContainer></DashboardLayout>
  );
}

export default LibrarianDashboard;
