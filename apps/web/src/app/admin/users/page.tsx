'use client';

import React, { useState, useEffect } from 'react';
import { AuthGuard } from '../../../components/auth-guard';
import { AdminLayout } from '../../../components/layouts/admin-layout';
import { useAuth } from '../../../context/auth-context';
import { Card, Button, Badge } from '@cdsprep/ui';
import {
  Users,
  Search,
  Filter,
  Shield,
  ShieldAlert,
  CheckCircle,
  XCircle,
  UserCheck,
  UserX,
  RefreshCw,
  Eye,
  Key,
} from 'lucide-react';
import { RoleType, AcademyTarget } from '@cdsprep/types';
import { apiRequest } from '../../../lib/api';

interface UserListItem {
  id: string;
  email: string;
  fullName: string;
  targetAcademy: AcademyTarget;
  isEmailVerified: boolean;
  isSuspended: boolean;
  currentStreak: number;
  roles: RoleType[];
  createdAt: string;
  attemptsCount: number;
  practiceSessionsCount: number;
  reportsCount: number;
}

export default function AdminUsersPage() {
  return (
    <AuthGuard allowedRoles={[RoleType.SUPER_ADMIN, RoleType.ADMIN]}>
      <AdminLayout>
        <UsersManagementContent />
      </AdminLayout>
    </AuthGuard>
  );
}

function UsersManagementContent() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.roles?.includes(RoleType.SUPER_ADMIN);

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [academyFilter, setAcademyFilter] = useState<string>('ALL');
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [statusActionReason, setStatusActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter !== 'ALL') params.set('role', roleFilter);
      if (academyFilter !== 'ALL') params.set('academy', academyFilter);

      const res = await apiRequest<{ items: UserListItem[] }>(`/admin/users?${params.toString()}`);
      setUsers(res.items || []);
    } catch {
      // Mock fallback data for demonstration if offline
      setUsers([
        {
          id: 'cadet-01',
          email: 'cadet.vikram@cdsprep.in',
          fullName: 'Vikram Batra',
          targetAcademy: AcademyTarget.IMA,
          isEmailVerified: true,
          isSuspended: false,
          currentStreak: 12,
          roles: [RoleType.STUDENT],
          createdAt: new Date().toISOString(),
          attemptsCount: 8,
          practiceSessionsCount: 24,
          reportsCount: 1,
        },
        {
          id: 'admin-02',
          email: 'officer.karan@cdsprep.in',
          fullName: 'Major Karan Thapar',
          targetAcademy: AcademyTarget.IMA,
          isEmailVerified: true,
          isSuspended: false,
          currentStreak: 45,
          roles: [RoleType.ADMIN],
          createdAt: new Date().toISOString(),
          attemptsCount: 0,
          practiceSessionsCount: 2,
          reportsCount: 0,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, academyFilter]);

  const handleModeration = async (userId: string, action: 'SUSPEND' | 'ACTIVATE') => {
    setActionLoading(true);
    try {
      await apiRequest(`/admin/users/${userId}/status`, {
        method: 'POST',
        body: JSON.stringify({ action, reason: statusActionReason || 'Administrative moderation action' }),
      });
      setStatusActionReason('');
      fetchUsers();
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, isSuspended: action === 'SUSPEND' } : null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to apply moderation action');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignRole = async (userId: string, role: RoleType) => {
    if (!isSuperAdmin) {
      alert('Only SUPER_ADMIN officers can assign or change roles');
      return;
    }
    setActionLoading(true);
    try {
      await apiRequest(`/admin/users/${userId}/roles`, {
        method: 'POST',
        body: JSON.stringify({ role }),
      });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to assign role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeRole = async (userId: string, role: RoleType) => {
    if (!isSuperAdmin) {
      alert('Only SUPER_ADMIN officers can revoke roles');
      return;
    }
    setActionLoading(true);
    try {
      await apiRequest(`/admin/users/${userId}/roles/${role}`, {
        method: 'DELETE',
      });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke role');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Users className="h-6 w-6 text-amber-400" />
            <span>Cadet & Officer Directory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Search candidates, inspect examination participation, manage staff permissions, and enforce account moderation.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchUsers}
          className="border-slate-800 text-slate-300 hover:bg-slate-900 flex items-center gap-1.5 text-xs self-start"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Reload</span>
        </Button>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 border-slate-800 bg-slate-900/60 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by full name or email address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-9 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-amber-500 focus:outline-none"
            >
              <option value="ALL">All Roles</option>
              <option value={RoleType.STUDENT}>STUDENT</option>
              <option value={RoleType.ADMIN}>ADMIN</option>
              <option value={RoleType.SUPER_ADMIN}>SUPER_ADMIN</option>
              <option value={RoleType.MODERATOR}>MODERATOR</option>
              <option value={RoleType.CONTENT_MANAGER}>CONTENT_MANAGER</option>
            </select>

            <select
              value={academyFilter}
              onChange={(e) => setAcademyFilter(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-amber-500 focus:outline-none"
            >
              <option value="ALL">All Academies</option>
              <option value={AcademyTarget.IMA}>IMA (Dehradun)</option>
              <option value={AcademyTarget.INA}>INA (Ezhimala)</option>
              <option value={AcademyTarget.AFA}>AFA (Dundigal)</option>
              <option value={AcademyTarget.OTA}>OTA (Chennai)</option>
            </select>

            <Button
              size="sm"
              onClick={fetchUsers}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
            >
              Filter
            </Button>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">User / Candidate</th>
                <th className="px-4 py-3 font-semibold">Target Academy</th>
                <th className="px-4 py-3 font-semibold">Assigned Roles</th>
                <th className="px-4 py-3 font-semibold">Activity Streak</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-500" />
                    <span>Loading users directory...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No users found matching query criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-white">{u.fullName || 'Unnamed Candidate'}</div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                        <span>{u.email}</span>
                        {u.isEmailVerified ? (
                          <span title="Email Verified"><CheckCircle className="h-3 w-3 text-emerald-400" /></span>
                        ) : (
                          <span title="Unverified"><XCircle className="h-3 w-3 text-slate-600" /></span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                        {u.targetAcademy}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <Badge
                            key={r}
                            variant={r === RoleType.SUPER_ADMIN ? 'destructive' : r === RoleType.ADMIN ? 'warning' : 'outline'}
                            className="text-[10px] py-0"
                          >
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-amber-400">{u.currentStreak} Days</span>
                      <span className="text-[10px] text-slate-500 block">
                        {u.attemptsCount} tests | {u.practiceSessionsCount} drills
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.isSuspended ? (
                        <Badge variant="destructive" className="text-[10px]">SUSPENDED</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">ACTIVE</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUser(u)}
                          className="text-xs text-slate-300 hover:text-white"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          <span>Inspect</span>
                        </Button>
                        {u.isSuspended ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => handleModeration(u.id, 'ACTIVATE')}
                            className="text-xs border-emerald-800/40 text-emerald-400 hover:bg-emerald-950/30"
                          >
                            <UserCheck className="h-3.5 w-3.5 mr-1" />
                            <span>Reactivate</span>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => handleModeration(u.id, 'SUSPEND')}
                            className="text-xs border-rose-900/40 text-rose-400 hover:bg-rose-950/30"
                          >
                            <UserX className="h-3.5 w-3.5 mr-1" />
                            <span>Suspend</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* User Details & Role Manager Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-slate-950 border-l border-slate-800 p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-lg font-black text-white">{selectedUser.fullName}</h2>
                  <p className="text-xs text-slate-400 font-mono">{selectedUser.email}</p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Status Banner */}
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center justify-between">
                <span className="text-xs text-slate-400">Account Standing:</span>
                {selectedUser.isSuspended ? (
                  <Badge variant="destructive">SUSPENDED</Badge>
                ) : (
                  <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">ACTIVE</Badge>
                )}
              </div>

              {/* Academy & Metrics */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Target</span>
                  <span className="text-sm font-bold text-amber-400">{selectedUser.targetAcademy}</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Tests</span>
                  <span className="text-sm font-bold text-white">{selectedUser.attemptsCount}</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">Streak</span>
                  <span className="text-sm font-bold text-emerald-400">{selectedUser.currentStreak}d</span>
                </div>
              </div>

              {/* Role Management (Super Admin Exclusive) */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-amber-400" />
                    <span>Role Management</span>
                  </span>
                  {!isSuperAdmin && (
                    <span className="text-[10px] text-amber-400">Requires SUPER_ADMIN clearance</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedUser.roles.map((r) => (
                    <div
                      key={r}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-white"
                    >
                      <span>{r}</span>
                      {isSuperAdmin && r !== RoleType.STUDENT && (
                        <button
                          onClick={() => handleRevokeRole(selectedUser.id, r)}
                          className="text-rose-400 hover:text-rose-300 ml-1 font-bold"
                          title="Revoke Role"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {isSuperAdmin && (
                  <div className="pt-2">
                    <span className="text-[11px] text-slate-400 block mb-1">Grant Additional Clearance:</span>
                    <div className="flex gap-1.5">
                      {[RoleType.ADMIN, RoleType.CONTENT_MANAGER, RoleType.MODERATOR].map((role) => (
                        <Button
                          key={role}
                          variant="outline"
                          size="sm"
                          disabled={selectedUser.roles.includes(role) || actionLoading}
                          onClick={() => handleAssignRole(selectedUser.id, role)}
                          className="text-[10px] py-1 border-slate-800 text-slate-300 hover:border-amber-500/40"
                        >
                          + {role}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Moderation Actions */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                  <span>Account Moderation Action</span>
                </span>
                <input
                  type="text"
                  placeholder="Audit reason (e.g. Terms violation, candidate request)..."
                  value={statusActionReason}
                  onChange={(e) => setStatusActionReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />

                <div className="flex gap-2">
                  {selectedUser.isSuspended ? (
                    <Button
                      onClick={() => handleModeration(selectedUser.id, 'ACTIVATE')}
                      disabled={actionLoading}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold"
                    >
                      Reactivate Account
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleModeration(selectedUser.id, 'SUSPEND')}
                      disabled={actionLoading}
                      className="flex-1 bg-rose-600 hover:bg-rose-500 text-xs font-bold"
                    >
                      Suspend Cadet Account
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-right">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedUser(null)}
                className="text-xs"
              >
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
