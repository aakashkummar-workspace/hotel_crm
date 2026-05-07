import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Avatar, Pill, SectionHeader } from '../components/primitives.jsx';
import { api } from '../api.js';

const SECURITY_KEY = 'aurelia.security';
const INTEGRATIONS_KEY = 'aurelia.integrations';
const DEFAULT_SECURITY = {
  '2fa': true, 'session_timeout': true, 'ip_allowlist': false, 'encrypted_at_rest': true,
};
const DEFAULT_INTEGRATIONS = {
  'WhatsApp Business': true, 'Razorpay': true, 'Booking.com': true,
  'Google Calendar': false, 'Cloudinary': true, 'Mailchimp': false,
};

export default function Settings({ onToast }) {
  const [tab, setTab] = useState('hotel');
  const [profile, setProfile] = useState({ name: '', tagline: '', location: '', email: '', phone: '', gstin: '', currency: 'INR', about: '' });
  const [tax, setTax] = useState({ room: 18, cafe: 5, hall: 18, invoice_prefix: 'INV-2026-', invoice_next: 425 });
  const [saving, setSaving] = useState(false);
  const [security, setSecurity] = useState(() => {
    try { return { ...DEFAULT_SECURITY, ...JSON.parse(localStorage.getItem(SECURITY_KEY) || '{}') }; }
    catch { return DEFAULT_SECURITY; }
  });
  const [integrations, setIntegrations] = useState(() => {
    try { return { ...DEFAULT_INTEGRATIONS, ...JSON.parse(localStorage.getItem(INTEGRATIONS_KEY) || '{}') }; }
    catch { return DEFAULT_INTEGRATIONS; }
  });
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    api.settings.profile().then(p => setProfile(prev => ({ ...prev, ...p })));
    api.settings.tax().then(setTax);
    api.activity.list().then(setActivity);
  }, []);

  useEffect(() => { try { localStorage.setItem(SECURITY_KEY, JSON.stringify(security)); } catch { /* ignore */ } }, [security]);
  useEffect(() => { try { localStorage.setItem(INTEGRATIONS_KEY, JSON.stringify(integrations)); } catch { /* ignore */ } }, [integrations]);

  const setProfileField = (k, v) => setProfile(p => ({ ...p, [k]: v }));

  const reloadProfile = async () => {
    const p = await api.settings.profile();
    setProfile(prev => ({ ...prev, ...p }));
    onToast?.('Changes discarded');
  };

  const saveProfile = async () => {
    setSaving(true);
    try { await api.settings.updateProfile(profile); onToast('Hotel profile saved'); }
    catch (e) { onToast(e.message || 'Could not save'); }
    finally { setSaving(false); }
  };

  const toggleSecurity = (k) => setSecurity(s => ({ ...s, [k]: !s[k] }));
  const toggleIntegration = (name) => {
    setIntegrations(s => ({ ...s, [name]: !s[name] }));
    onToast?.(`${name} ${integrations[name] ? 'disconnected' : 'connected'}`);
  };

  const saveTax = async () => {
    setSaving(true);
    try {
      await api.settings.updateTax({
        room: Number(tax.room), cafe: Number(tax.cafe), hall: Number(tax.hall),
        invoice_prefix: tax.invoice_prefix, invoice_next: Number(tax.invoice_next),
      });
      onToast('Tax & invoice settings saved');
    } catch (e) { onToast(e.message || 'Could not save'); }
    finally { setSaving(false); }
  };

  const sections = [
    { id: 'hotel', label: 'Hotel profile', icon: 'building' },
    { id: 'team', label: 'Team & roles', icon: 'users' },
    { id: 'integrations', label: 'Integrations', icon: 'link' },
    { id: 'billing', label: 'Billing & tax', icon: 'receipt' },
    { id: 'security', label: 'Security', icon: 'key' },
    { id: 'audit', label: 'Activity log', icon: 'list' },
  ];

  return (
    <div className="page page-enter">
      <SectionHeader eyebrow="Account" title="Settings" sub="Hotel details, team, integrations, and preferences" />

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
        <div className="col gap-1">
          {sections.map(s => (
            <div key={s.id} className="nav-item" data-active={tab === s.id} onClick={() => setTab(s.id)}>
              <span className="nav-icon"><Icon name={s.icon} size={16} /></span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        <div className="col gap-4">
          {tab === 'hotel' && (
            <div className="card" style={{ padding: 24 }}>
              <div className="display" style={{ fontSize: 20, marginBottom: 6 }}>Hotel profile</div>
              <div style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 22 }}>This appears on your booking page, invoices, and emails.</div>

              <div className="col gap-4">
                <div className="row gap-3">
                  <div style={{ flex: 1 }}>
                    <div className="label" style={{ marginBottom: 6 }}>Hotel name</div>
                    <input className="input" value={profile.name || ''} onChange={e => setProfileField('name', e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="label" style={{ marginBottom: 6 }}>Location</div>
                    <input className="input" value={profile.location || ''} onChange={e => setProfileField('location', e.target.value)} />
                  </div>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 6 }}>Tagline</div>
                  <input className="input" value={profile.tagline || ''} onChange={e => setProfileField('tagline', e.target.value)} />
                </div>
                <div className="row gap-3">
                  <div style={{ flex: 1 }}>
                    <div className="label" style={{ marginBottom: 6 }}>Concierge email</div>
                    <input className="input" type="email" value={profile.email || ''} onChange={e => setProfileField('email', e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="label" style={{ marginBottom: 6 }}>Phone</div>
                    <input className="input" value={profile.phone || ''} onChange={e => setProfileField('phone', e.target.value)} />
                  </div>
                </div>
                <div className="row gap-3">
                  <div style={{ flex: 1 }}>
                    <div className="label" style={{ marginBottom: 6 }}>GSTIN</div>
                    <input className="input" value={profile.gstin || ''} onChange={e => setProfileField('gstin', e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="label" style={{ marginBottom: 6 }}>Currency</div>
                    <select className="input" value={profile.currency || 'INR'} onChange={e => setProfileField('currency', e.target.value)}>
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 6 }}>About</div>
                  <textarea className="input" rows="4" value={profile.about || ''} onChange={e => setProfileField('about', e.target.value)} />
                </div>
              </div>

              <div className="row gap-3" style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
                <button className="btn" onClick={reloadProfile} disabled={saving}>Discard</button>
                <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
                  <Icon name="check" size={14} strokeWidth={2.4} />{saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          )}

          {tab === 'team' && (
            <div className="card" style={{ padding: 24 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 18 }}>
                <div>
                  <div className="display" style={{ fontSize: 20 }}>Team</div>
                  <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 2 }}>4 staff members · admin & front desk roles</div>
                </div>
                <button className="btn btn-primary" onClick={() => onToast?.('Invite flow coming soon — wire POST /api/auth/users')}><Icon name="plus" size={14} />Invite</button>
              </div>
              <div className="col gap-2">
                {[
                  { name: 'Vikram Pillai', role: 'General Manager', online: true },
                  { name: 'Meera Anand', role: 'Front Desk Lead', online: true },
                  { name: 'Karthik R.', role: 'Café Manager', online: true },
                  { name: 'Ravi Kumar', role: 'Housekeeping Sup.', online: false },
                ].map(s => (
                  <div key={s.name} className="row gap-3" style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 12 }}>
                    <Avatar name={s.name} size={40} />
                    <div style={{ flex: 1 }}>
                      <div className="row gap-2" style={{ alignItems: 'center' }}>
                        <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{s.name}</div>
                        {s.online && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7fa67a', boxShadow: '0 0 0 2px rgba(127,166,122,0.2)' }} />}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{s.role}</div>
                    </div>
                    <Pill tone={s.role.includes('Manager') ? 'gold' : 'blue'}>{s.role.includes('Manager') ? 'Admin' : 'Staff'}</Pill>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'integrations' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              {[
                { name: 'WhatsApp Business', desc: 'Auto-send booking confirmations and reminders', icon: 'whatsapp', accent: '#25d366' },
                { name: 'Razorpay', desc: 'UPI, card, and wallet payments on booking page', icon: 'arrowDown', accent: '#3395ff' },
                { name: 'Booking.com', desc: 'Sync inventory and rates with channel manager', icon: 'building', accent: '#003580' },
                { name: 'Google Calendar', desc: 'Push hall events to manager calendars', icon: 'calendar', accent: '#4285f4' },
                { name: 'Cloudinary', desc: 'Image hosting and optimization for room photos', icon: 'sparkle', accent: '#3448c5' },
                { name: 'Mailchimp', desc: 'Send guest newsletters and seasonal offers', icon: 'mail', accent: '#ffe01b' },
              ].map(i => {
                const connected = !!integrations[i.name];
                return (
                  <div key={i.name} className="card" style={{ padding: 18 }}>
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${i.accent}1f`, color: i.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={i.icon} size={18} /></div>
                      {connected ? <Pill tone="green" icon="check">Connected</Pill> : <Pill>Not connected</Pill>}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{i.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.5 }}>{i.desc}</div>
                    <button className="btn btn-sm" style={{ marginTop: 12, width: '100%' }} onClick={() => toggleIntegration(i.name)}>
                      {connected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'billing' && (
            <div className="card" style={{ padding: 24 }}>
              <div className="display" style={{ fontSize: 20, marginBottom: 6 }}>Billing & tax</div>
              <div style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 22 }}>Tax rates and invoice numbering.</div>
              <div className="col gap-4">
                <div className="row gap-3">
                  <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 6 }}>Room GST %</div><input className="input" type="number" value={tax.room} onChange={e => setTax(t => ({ ...t, room: e.target.value }))} /></div>
                  <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 6 }}>Café GST %</div><input className="input" type="number" value={tax.cafe} onChange={e => setTax(t => ({ ...t, cafe: e.target.value }))} /></div>
                  <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 6 }}>Hall GST %</div><input className="input" type="number" value={tax.hall} onChange={e => setTax(t => ({ ...t, hall: e.target.value }))} /></div>
                </div>
                <div className="row gap-3">
                  <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 6 }}>Invoice prefix</div><input className="input" value={tax.invoice_prefix} onChange={e => setTax(t => ({ ...t, invoice_prefix: e.target.value }))} /></div>
                  <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 6 }}>Next number</div><input className="input" type="number" value={tax.invoice_next} onChange={e => setTax(t => ({ ...t, invoice_next: e.target.value }))} /></div>
                </div>
              </div>
              <div className="row gap-3" style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
                <button className="btn btn-primary" onClick={saveTax} disabled={saving}><Icon name="check" size={14} strokeWidth={2.4} />Save changes</button>
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div className="card" style={{ padding: 24 }}>
              <div className="display" style={{ fontSize: 20, marginBottom: 18 }}>Security</div>
              <div className="col gap-3">
                {[
                  { key: '2fa', title: 'Two-factor authentication', sub: 'Required for all admins' },
                  { key: 'session_timeout', title: 'Session timeout after 30 min idle', sub: 'On all devices' },
                  { key: 'ip_allowlist', title: 'IP allowlist for admin actions', sub: 'Restrict to office Wi-Fi' },
                  { key: 'encrypted_at_rest', title: 'Encrypted guest data at rest', sub: 'AES-256 on all PII fields' },
                ].map(s => {
                  const enabled = !!security[s.key];
                  return (
                    <div key={s.key} className="row" style={{ padding: 14, background: 'var(--bg-3)', borderRadius: 10, justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{s.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{s.sub}</div>
                      </div>
                      <div onClick={() => toggleSecurity(s.key)} style={{ width: 36, height: 20, borderRadius: 10, background: enabled ? 'var(--gold)' : 'var(--line-2)', position: 'relative', cursor: 'pointer', transition: 'background .2s' }}>
                        <div style={{ position: 'absolute', top: 2, left: enabled ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#15110c', transition: 'left .2s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'audit' && (
            <div className="card">
              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--line)' }}>
                <div className="display" style={{ fontSize: 20 }}>Activity log</div>
                <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 2 }}>Audit trail for all admin actions</div>
              </div>
              <div>
                {activity.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>No activity yet.</div>}
                {activity.map(e => (
                  <div key={e.id} className="row gap-3" style={{ padding: '14px 24px', borderBottom: '1px solid var(--line)' }}>
                    <Avatar name={e.user_name || 'System'} size={32} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13 }}>
                        <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{e.user_name || 'System'}</span>{' '}
                        <span style={{ color: 'var(--ink-3)' }}>{e.action}</span>
                      </div>
                      {e.target && <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{e.target}</div>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{new Date(e.created_at + 'Z').toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
