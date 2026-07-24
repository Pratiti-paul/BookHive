import useAuth from "../../hooks/useAuth";
import DashboardLayout from "../../layouts/DashboardLayout";
import PageContainer from "../../components/common/PageContainer";

function Home() {
    const { user } = useAuth();

    return (
        <DashboardLayout><PageContainer>
                <h1 className="text-3xl font-bold text-gray-900">
                    Welcome {user?.name}
                </h1>

            <p className="mt-4 text-gray-600">
                {user?.email}
            </p>

        </PageContainer></DashboardLayout>
    );
}

export default Home;
