import { useState, useEffect } from 'react';
import { apiClient } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import EmailInput from './EmailInput';

export default function AccountManagementSection() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [savingEmail, setSavingEmail] = useState(false);
  
  // Sync email state with user prop
  useEffect(() => {
    if (user?.email && !editingEmail) {
      setNewEmail(user.email);
    }
  }, [user?.email, editingEmail]);
  
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleUpdateEmail = async () => {
    if (!newEmail || newEmail === user?.email) {
      setEditingEmail(false);
      return;
    }

    if (!newEmail.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    setSavingEmail(true);
    try {
      await apiClient.updateAccountInfo({ email: newEmail });
      await refreshUser();
      showToast('Email updated successfully', 'success');
      setEditingEmail(false);
    } catch (error: any) {
      console.error('Failed to update email:', error);
      const errorMessage = error?.response?.data?.detail?.message || error?.message || 'Failed to update email';
      showToast(errorMessage, 'error');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Please fill in all password fields', 'error');
      return;
    }

    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters long', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    if (newPassword === currentPassword) {
      showToast('New password must be different from current password', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      await apiClient.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      showToast('Password changed successfully', 'success');
      setChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Failed to change password:', error);
      const errorMessage = error?.response?.data?.detail?.message || error?.message || 'Failed to change password';
      if (errorMessage.toLowerCase().includes('incorrect') || errorMessage.toLowerCase().includes('invalid')) {
        showToast('Current password is incorrect', 'error');
      } else {
        showToast(errorMessage, 'error');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Details */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            User ID
          </label>
          <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-600">
            {user?.id || 'N/A'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          {editingEmail ? (
            <div className="flex gap-2">
              <div className="flex-1">
                <EmailInput
                  value={newEmail}
                  onChange={setNewEmail}
                  placeholder="Enter new email"
                  disabled={savingEmail}
                  className="w-full"
                />
              </div>
              <button
                onClick={handleUpdateEmail}
                disabled={savingEmail}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingEmail ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setEditingEmail(false);
                  setNewEmail(user?.email || '');
                }}
                disabled={savingEmail}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-gray-900">{user?.email || 'N/A'}</span>
              <button
                onClick={() => setEditingEmail(true)}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account Created
          </label>
          <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
            {user?.created ? new Date(user.created).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }) : 'N/A'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Last Updated
          </label>
          <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
            {user?.updated ? new Date(user.updated).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }) : 'N/A'}
          </div>
        </div>
      </div>

      {/* Change Password Section */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h4>
        
        {changingPassword ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter current password"
                disabled={savingPassword}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter new password (min 8 characters)"
                disabled={savingPassword}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Confirm new password"
                disabled={savingPassword}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleChangePassword}
                disabled={savingPassword}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingPassword ? 'Changing...' : 'Change Password'}
              </button>
              <button
                onClick={() => {
                  setChangingPassword(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={savingPassword}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setChangingPassword(true)}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Change Password
          </button>
        )}
      </div>
    </div>
  );
}

