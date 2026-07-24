function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-yellow-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-600">
          403
        </h1>

        <p className="mt-4 text-gray-600">
          You are not authorized to access this page.
        </p>
      </div>
    </div>
  );
}

export default Unauthorized;