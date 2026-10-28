import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 font-extrabold text-2xl">
        404
      </div>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
        Page Not Found
      </h1>
      <p className="text-slate-600 text-base max-w-md mx-auto">
        The roofing page you are looking for does not exist or may have been relocated.
      </p>
      <div className="pt-4 flex justify-center gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Return Home</span>
        </Link>
        <Link
          to="/services"
          className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>View Roofing Services</span>
        </Link>
      </div>
    </div>
  );
};
