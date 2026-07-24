import RegisterForm from "../../components/forms/RegisterForm";
import AuthLayout from "../../layouts/AuthLayout";

function Register() {
  return (
    <AuthLayout><div className="min-h-screen bg-yellow-50 flex items-center justify-center p-6">
      <RegisterForm />
    </div></AuthLayout>
  );
}

export default Register;
