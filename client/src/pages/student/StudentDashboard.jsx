import DashboardLayout from "../../layouts/DashboardLayout";
import PageContainer from "../../components/common/PageContainer";

function StudentDashboard() {
  return (
    <DashboardLayout><PageContainer>
      <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Welcome to BookHive 📚
      </p>
    </PageContainer></DashboardLayout>
  );
}

export default StudentDashboard;
