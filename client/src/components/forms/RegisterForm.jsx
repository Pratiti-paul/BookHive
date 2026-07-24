import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";

import { registerUser } from "../../services/authService";

function RegisterForm() {
  const navigate = useNavigate();

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

      const response = await registerUser(data);

      toast.success(response.message);

      navigate("/login");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-yellow-500">
          🐝 BookHive
        </h1>

        <p className="text-gray-500 mt-2">
          Create your account
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
        {/* Name */}

        <div>
          <label className="font-medium">
            Full Name
          </label>

          <div className="mt-2 flex items-center border rounded-lg px-3">
            <User size={18} />

            <input
              {...register("name", {
                required: "Name is required",
              })}
              placeholder="John Doe"
              className="w-full p-3 outline-none"
            />
          </div>

          {errors.name && (
            <p className="text-red-500 text-sm mt-1">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Email */}

        <div>
          <label className="font-medium">
            Email
          </label>

          <div className="mt-2 flex items-center border rounded-lg px-3">
            <Mail size={18} />

            <input
              {...register("email", {
                required: "Email is required",
              })}
              type="email"
              placeholder="john@gmail.com"
              className="w-full p-3 outline-none"
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
              {...register("password", {
                required: "Password is required",
                minLength: {
                  value: 6,
                  message: "Minimum 6 characters",
                },
              })}
              type={showPassword ? "text" : "password"}
              placeholder="********"
              className="w-full p-3 outline-none"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(!showPassword)
              }
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
          disabled={loading}
          className="w-full bg-yellow-500 hover:bg-yellow-600 transition text-white py-3 rounded-lg font-semibold"
        >
          {loading
            ? "Creating Account..."
            : "Create Account"}
        </button>
      </form>

      <p className="text-center mt-6">
        Already have an account?{" "}
        <Link
          to="/login"
          className="text-yellow-500 font-semibold"
        >
          Login
        </Link>
      </p>
    </div>
  );
}

export default RegisterForm;