import LoginForm from "../../components/forms/LoginForm";
import AuthLayout from "../../layouts/AuthLayout";

function Login() {
  return (
    <AuthLayout><div className="min-h-screen bg-yellow-50 flex items-center justify-center p-6">
      <LoginForm />
    </div></AuthLayout>
  );
}

export default Login;
