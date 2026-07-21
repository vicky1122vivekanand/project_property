import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "tenant",
    phone: "",
    propertyId: "",
    propertyName: "",
    propertyAddress: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get("/properties")
      .then((res) => setProperties(res.data.data))
      .catch(() => setProperties([]));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold text-xl">
            P
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-gray-900">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">Join PropertyHub to manage rentals with ease</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

          <div>
            <label className="label">Full name</label>
            <input className="input" name="name" value={form.name} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" name="email" value={form.email} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              name="password"
              value={form.password}
              onChange={handleChange}
              minLength={6}
              required
            />
          </div>
          <div>
            <label className="label">Phone (optional)</label>
            <input className="input" name="phone" value={form.phone} onChange={handleChange} />
          </div>
          <div>
            <label className="label">I am a...</label>
            <select className="input" name="role" value={form.role} onChange={handleChange}>
              <option value="tenant">Tenant</option>
              <option value="owner">Property Owner</option>
              <option value="staff">Maintenance Staff</option>
            </select>
          </div>

          {form.role === "owner" ? (
            <div className="space-y-4 rounded-lg bg-gray-50 border border-gray-200 p-3">
              <p className="text-xs font-medium text-gray-500">Set up your property</p>
              <div>
                <label className="label">Property name</label>
                <input
                  className="input"
                  name="propertyName"
                  value={form.propertyName}
                  onChange={handleChange}
                  placeholder="e.g. Sunrise Residency"
                  required
                />
              </div>
              <div>
                <label className="label">Property address</label>
                <input
                  className="input"
                  name="propertyAddress"
                  value={form.propertyAddress}
                  onChange={handleChange}
                  placeholder="Street, City"
                  required
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="label">Select your property</label>
              <select className="input" name="propertyId" value={form.propertyId} onChange={handleChange} required>
                <option value="">-- Select property --</option>
                {properties.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.address})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-primary-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
