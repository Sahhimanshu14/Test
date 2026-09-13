'use client';

import React, { useState } from 'react';
import { PublicLayout } from '../../components/layouts/public-layout';
import { Card, Button, Badge } from '@cdsprep/ui';
import { Mail, MessageSquare, AlertCircle, Shield, CheckCircle2 } from 'lucide-react';

export default function ContactSupportPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formType, setFormType] = useState<'GENERAL' | 'BUG' | 'CONTENT' | 'PRIVACY'>('GENERAL');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) return;
    setSubmitted(true);
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 space-y-10">
        <div className="space-y-3 text-center">
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
            Cadet Support &amp; Desk
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Contact &amp; Issue Resolution</h1>
          <p className="text-xs text-slate-400 max-w-xl mx-auto">
            Need account assistance, have a question regarding syllabus derivations, or want to submit a privacy request? Reach out to our technical team.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-5 border-slate-800 bg-slate-900/60 space-y-2">
            <Mail className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">General Inquiries</h3>
            <p className="text-xs text-slate-400">support@your-domain</p>
            <p className="text-[11px] text-slate-500">Typical response within 12 hours</p>
          </Card>

          <Card className="p-5 border-slate-800 bg-slate-900/60 space-y-2">
            <AlertCircle className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Question Disputes</h3>
            <p className="text-xs text-slate-400">content@your-domain</p>
            <p className="text-[11px] text-slate-500">Reviewed by subject moderators</p>
          </Card>

          <Card className="p-5 border-slate-800 bg-slate-900/60 space-y-2">
            <Shield className="h-5 w-5 text-sky-400" />
            <h3 className="text-sm font-bold text-white">Privacy &amp; DPDPA</h3>
            <p className="text-xs text-slate-400">privacy@your-domain</p>
            <p className="text-[11px] text-slate-500">Data protection officer desk</p>
          </Card>
        </div>

        <Card className="p-8 border-slate-800 bg-slate-900/80 max-w-2xl mx-auto">
          {submitted ? (
            <div className="text-center py-10 space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
              <h2 className="text-lg font-bold text-white">Message Transmitted Cleanly</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Thank you Cadet. Your ticket has been logged and forwarded to the duty officer. You will receive an acknowledgment at <span className="text-white font-semibold">{email}</span>.
              </p>
              <div className="pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSubmitted(false);
                    setMessage('');
                    setSubject('');
                  }}
                >
                  Send Another Inquiry
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Inquiry Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'GENERAL', label: 'General' },
                    { id: 'BUG', label: 'Bug Report' },
                    { id: 'CONTENT', label: 'Content Error' },
                    { id: 'PRIVACY', label: 'Data Privacy' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFormType(t.id as any)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
                        formType === t.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Registered Cadet Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cadet@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Subject *</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Summary of inquiry or issue"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Message / Question Details *</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your inquiry, question identifier, or reproduction steps..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <Button type="submit" className="w-full font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs">
                Submit Support Dispatch
              </Button>
            </form>
          )}
        </Card>
      </div>
    </PublicLayout>
  );
}
