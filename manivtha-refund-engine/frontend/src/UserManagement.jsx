import { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Mail, Clock, X, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { userService } from './services/api';
import { useUser } from './App';

export default function UserManagementPage() {
  const { user } = useUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingRoleFor, setUpdatingRoleFor] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'STAFF' });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, []);

  const handleFireUser = async (userId) => {
    if (!window.confirm("Are you sure you want to fire this user? This action will revoke their access immediately.")) return;
    setLoading(true);
    try {
      await userService.fireUser(userId);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to fire user");
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingRoleFor(userId);
    try {
      await userService.updateUserRole(userId, newRole);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update role");
    } finally {
      setUpdatingRoleFor(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await userService.createUser(formData);
      setSuccess('User created successfully');
      setFormData({ name: '', email: '', password: '', role: 'STAFF' });
      fetchUsers();
      setTimeout(() => setShowModal(false), 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">User Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage system access and staff roles.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-md shadow-blue-600/20"
        >
          <UserPlus className="w-4 h-4" />
          Add New Staff
        </button>
      </div>

      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 dark:border-slate-700/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            System Users
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Joined Date</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-slate-500">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-slate-500">No users found.</td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">{u.name}</div>
                        <div className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" /> {u.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.role === 'ADMIN' && u.id !== user.id && u.is_active ? (
                        <div className="relative inline-block">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            disabled={updatingRoleFor === u.id}
                            className={`appearance-none pl-3 pr-7 py-1 rounded-full text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer ${
                              u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50' : 
                              u.role === 'MANAGER' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50' : 
                              'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                            } ${updatingRoleFor === u.id ? 'opacity-50 cursor-wait' : ''}`}
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="MANAGER">MANAGER</option>
                            <option value="STAFF">STAFF</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-500 dark:text-slate-400">
                            <Shield className="w-3 h-3" />
                          </div>
                        </div>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border flex w-fit items-center gap-1.5 ${
                          u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50' : 
                          u.role === 'MANAGER' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50' : 
                          'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        } ${!u.is_active ? 'opacity-60' : ''}`}>
                          <Shield className="w-3 h-3" />
                          {u.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {new Date(u.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {u.is_active ? (
                        <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-medium">
                          <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></span>
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-medium">
                          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                          Fired
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.is_active && (
                        (user.role === 'ADMIN' && u.role !== 'ADMIN') || 
                        (user.role === 'MANAGER' && u.role === 'STAFF')
                      ) && (
                        <button
                          onClick={() => handleFireUser(u.id)}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-lg transition-colors shadow-sm"
                        >
                          Fire User
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)}></div>
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-md relative z-10 animate-fade-in overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-500" />
                Add New Staff
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-start gap-2 border border-red-200 dark:border-red-900/30">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
              {success && (
                <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-3 rounded-lg text-sm flex items-start gap-2 border border-green-200 dark:border-green-900/30">
                  <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{success}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border border-slate-300/70 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" placeholder="Jane Doe" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 border border-slate-300/70 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" placeholder="jane@manivtha.com" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Temporary Password</label>
                <div className="relative">
                  <input required type={showPassword ? "text" : "password"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2 border border-slate-300/70 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all pr-10" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2 border border-slate-300/70 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all appearance-none">
                  <option value="STAFF">Staff (Basic Access)</option>
                  <option value="MANAGER">Manager (Elevated Access)</option>
                  <option value="ADMIN">Admin (Full Access)</option>
                </select>
              </div>
              
              <div className="pt-2">
                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg shadow-md transition-colors disabled:opacity-70 flex justify-center items-center gap-2">
                  {isSubmitting ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : 'Create User Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
