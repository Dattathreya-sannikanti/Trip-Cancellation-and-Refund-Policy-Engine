import re

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# LoginPage Rewrite
login_orig_pattern = re.compile(r'// 1\. LOGIN PAGE \(/login\).*?function LoginPage\(\) \{.*?return \((.*?)\);\n\}', re.DOTALL)
login_new_return = r'''
    <div className="min-h-screen bg-[#F4F7F6] flex items-center justify-center p-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Image Container */}
        <div className="md:w-1/2 w-full h-48 md:h-auto relative overflow-hidden bg-slate-200">
          <img 
            src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1000&auto=format&fit=crop" 
            alt="Corporate Travel" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#1A365D]/70 mix-blend-multiply"></div>
          <div className="absolute inset-0 p-8 flex flex-col justify-end text-white">
            <h2 className="text-3xl font-bold tracking-tight mb-2">Manivtha Tours</h2>
            <p className="text-sm text-blue-100 font-medium">Corporate Travel & Policy Engine</p>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="md:w-1/2 w-full p-8 md:p-12 flex flex-col justify-center">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-[#1A365D] tracking-tight">Staff Portal</h3>
              <p className="text-sm text-slate-500">Authorized personnel access only.</p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1A365D] uppercase tracking-wide block">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <User className="w-5 h-5" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@manivtha.com"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1A365D] uppercase tracking-wide block">System Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35] transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-[#FF6B35] text-white text-sm font-bold shadow-md hover:bg-[#e05923] shadow-[#FF6B35]/20 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:ring-offset-2 transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              Secure Login
            </button>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 leading-relaxed text-center">
              <strong>System Notice:</strong> Login is authenticated against local credentials. Use <code>admin@manivtha.com</code> / <code>password</code>.
            </div>
          </form>
        </div>
      </div>
    </div>
'''

def repl_login(m):
    original = m.group(0)
    pre_return = original.split('return (')[0]
    return pre_return + 'return (' + login_new_return + ');\n}'

code = login_orig_pattern.sub(repl_login, code)

# Dashboard Replacements
code = code.replace(
    'className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"',
    'className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-md"'
)
code = code.replace(
    '<h2 className="text-xl font-bold text-[#1A365D]">Welcome Back, Booking Agent</h2>',
    '<h2 className="text-2xl font-bold text-[#1A365D] tracking-tight">Welcome Back, Booking Agent</h2>'
)
code = code.replace(
    '<div className="grid grid-cols-1 md:grid-cols-3 gap-6">',
    '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">'
)
code = code.replace(
    '<div className="grid grid-cols-1 lg:grid-cols-5 gap-6">',
    '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">'
)
code = code.replace(
    '<div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-md p-6 flex flex-col justify-between space-y-6">',
    '<div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-md p-6 md:p-8 flex flex-col justify-between space-y-6">'
)
code = code.replace(
    '<div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-6">',
    '<div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-md p-6 md:p-8 space-y-6">'
)

# Cancellation Entry Form Page Replacements
code = code.replace(
    '<div className="max-w-3xl mx-auto space-y-6">',
    '<div className="w-full max-w-5xl mx-auto space-y-8">'
)

old_form_header = '''<div className="bg-[#1A365D] p-6 text-white">
          <h2 className="text-lg font-bold">Policy Calculation Form</h2>
          <p className="text-xs text-blue-200 mt-1">Select trip details to generate a policy-enforced refund rate.</p>
        </div>'''

new_form_header = '''{/* Header graphic banner */}
        <div className="w-full h-32 relative overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1542314831-c6a4d14eff3e?q=80&w=1000&auto=format&fit=crop" 
            alt="Travel Desk" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#1A365D]/80 mix-blend-multiply"></div>
          <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-center text-white">
            <h2 className="text-2xl font-bold tracking-tight">Policy Calculation Form</h2>
            <p className="text-sm text-blue-200 mt-1">Select trip details to generate a policy-enforced refund rate.</p>
          </div>
        </div>'''

code = code.replace(old_form_header, new_form_header)

# Audit Logs Replacements
code = code.replace(
    '<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">',
    '<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-md">'
)
code = code.replace(
    '<h2 className="text-base font-bold text-[#1A365D]">System Audit Log Ledger</h2>',
    '<h2 className="text-2xl font-bold text-[#1A365D] tracking-tight">System Audit Log Ledger</h2>'
)

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Done modifying App.jsx')
