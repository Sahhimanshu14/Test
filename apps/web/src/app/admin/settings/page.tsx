'use client';

import React, { useState, useEffect } from 'react';
import { AuthGuard } from '../../../components/auth-guard';
import { AdminLayout } from '../../../components/layouts/admin-layout';
import { useAuth } from '../../../context/auth-context';
import { Card, Button, Badge } from '@cdsprep/ui';
import {
  Settings,
  Shield,
  Save,
  AlertTriangle,
  RefreshCw,
  Sliders,
  CheckCircle,
} from 'lucide-react';
import { RoleType } from '@cdsprep/types';
import { apiRequest } from '../../../lib/api';

interface SystemSettings {
  maintenanceMode: boolean;
  defaultNegativeMarking: number;
  timerGracePeriodSeconds: number;
  aiDailyGenerationLimit: number;
  updatedAt?: string;
  updatedBy?: string;
}

export default function AdminSettingsPage() {
  return (
    <AuthGuard allowedRoles={[RoleType.SUPER_ADMIN, RoleType.ADMIN]}>
      <AdminLayout>
        <SettingsContent />
      </AdminLayout>
    </AuthGuard>
  );
}

function SettingsContent() {
  const { user } = useAuth();
  const isSuperAdmin = user?.roles?.includes(RoleType.SUPER_ADMIN);

  const [settings, setSettings] = useState<SystemSettings>({
    maintenanceMode: false,
    defaultNegativeMarking: 0.33,
    timerGracePeriodSeconds: 30,
    aiDailyGenerationLimit: 200,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<SystemSettings>('/admin/settings');
      setSettings(data);
    } catch {
      // Fallback defaults
      setSettings({
        maintenanceMode: false,
        defaultNegativeMarking: 0.33,
        timerGracePeriodSeconds: 30,
        aiDailyGenerationLimit: 200,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      alert('Only officers with SUPER_ADMIN clearance can modify system settings');
      return;
    }

    setSaving(true);
    try {
      await apiRequest('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });
      alert('Platform operational settings saved and recorded in audit trail.');
      fetchSettings();
    } catch (err: any) {
      alert(err.message || 'Failed to update system settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-amber-400" />
            <span>Platform Operational Settings</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global examination rules, negative marking defaults, autosave grace periods, and AI quota parameters.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchSettings}
          className="border-slate-800 text-slate-300 hover:bg-slate-800 flex items-center gap-1.5 text-xs self-start"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Reload</span>
        </Button>
      </div>

      {!isSuperAdmin && (
        <Card className="p-4 border-amber-900/40 bg-amber-950/20 flex items-center gap-3">
          <Shield className="h-5 w-5 text-amber-400 flex-shrink-0" />
          <span className="text-xs text-amber-200">
            Read-Only Mode: You are viewing operational settings with <code>ADMIN</code> clearance. Changes require <code>SUPER_ADMIN</code> privileges.
          </span>
        </Card>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Maintenance Mode */}
        <Card className="p-5 border-slate-800 bg-slate-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Examination Maintenance Mode</h3>
              <p className="text-xs text-slate-400">
                When active, test attempts and practice sessions are paused for platform upgrades.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                disabled={!isSuperAdmin}
                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
        </Card>

        {/* Exam Scoring Rules */}
        <Card className="p-5 border-slate-800 bg-slate-900/60 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">Default Exam Parameters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Default Negative Marking Ratio
              </label>
              <input
                type="number"
                step="0.01"
                disabled={!isSuperAdmin}
                value={settings.defaultNegativeMarking}
                onChange={(e) => setSettings({ ...settings, defaultNegativeMarking: parseFloat(e.target.value) || 0.33 })}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
              />
              <span className="text-[10px] text-slate-500 block mt-1">UPSC CDS standard is 1/3 (0.33) marks per wrong question.</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Timer Disconnect Grace Period (Seconds)
              </label>
              <input
                type="number"
                disabled={!isSuperAdmin}
                value={settings.timerGracePeriodSeconds}
                onChange={(e) => setSettings({ ...settings, timerGracePeriodSeconds: parseInt(e.target.value, 10) || 30 })}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
              />
              <span className="text-[10px] text-slate-500 block mt-1">Allows network reconnection before enforcing auto-submit.</span>
            </div>
          </div>
        </Card>

        {/* AI Generation Limits */}
        <Card className="p-5 border-slate-800 bg-slate-900/60 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400">AI Generation Quotas</h3>
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Daily AI Question Generation Batch Limit
            </label>
            <input
              type="number"
              disabled={!isSuperAdmin}
              value={settings.aiDailyGenerationLimit}
              onChange={(e) => setSettings({ ...settings, aiDailyGenerationLimit: parseInt(e.target.value, 10) || 200 })}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
            />
            <span className="text-[10px] text-slate-500 block mt-1">Prevents provider token exhaustion and rate limiting.</span>
          </div>
        </Card>

        {isSuperAdmin && (
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saving ? 'Saving...' : 'Save System Settings'}</span>
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
