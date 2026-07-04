const variants = {
  primary: "bg-brand text-white hover:bg-[#0F5C50] focus:ring-brand/30",
  secondary: "bg-white text-ink border border-line hover:bg-slate-50 focus:ring-slate-300",
  ghost: "text-ink hover:bg-slate-100 focus:ring-slate-300",
  danger: "bg-[#B42318] text-white hover:bg-[#912018] focus:ring-red-200"
};

const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  icon: "h-9 w-9 p-0"
};

export const Button = ({ children, variant = "primary", size = "md", className = "", type = "button", ...props }) => (
  <button
    type={type}
    className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
    {...props}
  >
    {children}
  </button>
);
