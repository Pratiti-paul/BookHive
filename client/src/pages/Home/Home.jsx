import useAuth from "../../hooks/useAuth";

function Home() {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-yellow-50">

            <h1 className="text-5xl font-bold">
                Welcome {user?.name} 🐝
            </h1>

            <p className="mt-4 text-gray-600">
                {user?.email}
            </p>

            <button
                onClick={logout}
                className="mt-8 bg-red-500 text-white px-6 py-3 rounded-lg"
            >
                Logout
            </button>

        </div>
    );
}

export default Home;