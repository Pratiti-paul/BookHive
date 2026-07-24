import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import logoFull from "../../assets/logo-full.svg";

import { loginUser } from "../../services/authService";
import useAuth from "../../hooks/useAuth";

function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      const response = await loginUser(data);

      // Save user and token in Auth Context
      login(response.token, response.user);

      toast.success(response.message);

      navigate("/");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
      <div className="text-center mb-8">
        <img
          src={logoFull}
          alt="BookHive"
          className="mx-auto object-contain w-36 md:w-44"
        />

        <p className="text-gray-500 mt-2">Welcome back</p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
        {/* Email */}
        <div>
          <label className="font-medium">
            Email
          </label>

          <div className="mt-2 flex items-center border rounded-lg px-3">
            <Mail size={18} />

            <input
              type="email"
              placeholder="john@gmail.com"
              className="w-full p-3 outline-none"
              {...register("email", {
                required: "Email is required",
              })}
            />
          </div>

          {errors.email && (
            <p className="text-red-500 text-sm mt-1">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="font-medium">
            Password
          </label>

          <div className="mt-2 flex items-center border rounded-lg px-3">
            <Lock size={18} />

            <input
              type={showPassword ? "text" : "password"}
              placeholder="********"
              className="w-full p-3 outline-none"
              {...register("password", {
                required: "Password is required",
              })}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff size={20} />
              ) : (
                <Eye size={20} />
              )}
            </button>
          </div>

          {errors.password && (
            <p className="text-red-500 text-sm mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-yellow-500 hover:bg-yellow-600 transition text-white py-3 rounded-lg font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Signing In..." : "Login"}
        </button>
      </form>

      <p className="text-center mt-6">
        Don't have an account?{" "}
        <Link
          to="/register"
          className="text-yellow-500 font-semibold hover:underline"
        >
          Register
        </Link>
      </p>
    </div>
  );
}

export default LoginForm;