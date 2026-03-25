import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateUser, getUserByEmail, generateCode, storeVerificationCode, getVerificationCode, clearVerificationCode } from '@/lib/storage';
import { User, Shield, Bell, Trash2, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  if (!user) return null;

  const handleProfileSave = () => {
    if (!fullName.trim()) { toast({ title: 'Error', description: 'Name cannot be empty.', variant: 'destructive' }); return; }
    updateUser(user.id, { fullName: fullName.trim() });
    refreshUser();
    toast({ title: '✅ Profile Updated', description: 'Your name has been updated.' });
  };

  const handlePasswordChange = () => {
    if (currentPassword !== user.password) { toast({ title: 'Error', description: 'Current password is incorrect.', variant: 'destructive' }); return; }
    if (newPassword.length < 6) { toast({ title: 'Error', description: 'New password must be at least 6 characters.', variant: 'destructive' }); return; }
    if (newPassword !== confirmPassword) { toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' }); return; }
    updateUser(user.id, { password: newPassword });
    refreshUser();
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast({ title: '✅ Password Updated', description: 'Your password has been changed.' });
  };

  const handleToggleSetting = (key: keyof typeof user.settings) => {
    const newSettings = { ...user.settings, [key]: !user.settings[key] };
    updateUser(user.id, { settings: newSettings });
    refreshUser();
    toast({ title: 'Setting Updated' });
  };

  const handleDeleteAccount = () => {
    const users = JSON.parse(localStorage.getItem('trevo_users') || '[]');
    const filtered = users.filter((u: any) => u.id !== user.id);
    localStorage.setItem('trevo_users', JSON.stringify(filtered));
    logout();
    navigate('/login');
    toast({ title: 'Account Deleted', description: 'Your account has been permanently deleted.' });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">Settings</h1>

      {/* Profile */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <User className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-display font-semibold text-foreground">Profile</h3>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="input-dark w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
          <input type="email" value={user.email} disabled className="input-dark w-full opacity-50 cursor-not-allowed" />
          <p className="text-xs text-muted-foreground mt-1">Email cannot be changed.</p>
        </div>
        <button onClick={handleProfileSave} className="btn-primary flex items-center gap-2 text-sm">
          <Save className="w-4 h-4" /> Save Changes
        </button>
      </div>

      {/* Security */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-display font-semibold text-foreground">Security</h3>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Current Password</label>
          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="input-dark w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">New Password</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input-dark w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Confirm New Password</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="input-dark w-full" />
        </div>
        <button onClick={handlePasswordChange} className="btn-primary text-sm">Change Password</button>

        <div className="border-t border-border pt-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
              <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
            </div>
            <button onClick={() => handleToggleSetting('twoFactorEnabled')} className={`w-12 h-6 rounded-full transition-colors ${user.settings.twoFactorEnabled ? 'bg-primary' : 'bg-muted'}`}>
              <div className={`w-5 h-5 rounded-full bg-foreground transition-transform ${user.settings.twoFactorEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-display font-semibold text-foreground">Notifications</h3>
        </div>
        {([
          ['depositAlerts', 'Deposit Alerts', 'Get notified for deposits'],
          ['withdrawalAlerts', 'Withdrawal Alerts', 'Get notified for withdrawals'],
          ['payoutAlerts', 'Payout Alerts', 'Get notified for ROI payouts'],
        ] as const).map(([key, title, desc]) => (
          <div key={key} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <button onClick={() => handleToggleSetting(key)} className={`w-12 h-6 rounded-full transition-colors ${user.settings[key] ? 'bg-primary' : 'bg-muted'}`}>
              <div className={`w-5 h-5 rounded-full bg-foreground transition-transform ${user.settings[key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        ))}
      </div>

      {/* Delete Account */}
      <div className="glass-card p-6 border-destructive/30">
        <div className="flex items-center gap-3 mb-4">
          <Trash2 className="w-5 h-5 text-destructive" />
          <h3 className="text-lg font-display font-semibold text-foreground">Delete Account</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">This action is permanent and cannot be undone.</p>
        {!deleteConfirm ? (
          <button onClick={() => setDeleteConfirm(true)} className="px-4 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors">
            Delete Account
          </button>
        ) : (
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(false)} className="btn-secondary text-sm">Cancel</button>
            <button onClick={handleDeleteAccount} className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium">
              Confirm Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
