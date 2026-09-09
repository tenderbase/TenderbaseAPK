'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Building2, AlertTriangle, CheckCircle2, Info, X,
  Plus, ShieldCheck, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { DateField, ReadRow, SavedToast, SelectField, TextField } from '@/components/company/Field';
import { DeadlineBadge } from '@/components/ui/DeadlineBadge';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { loadProfile, saveProfile } from '@/lib/company';
import { fetchProfile, persistProfile } from '@/lib/company-remote';
import { loadPreferences } from '@/lib/preferences';
import { fetchPreferences } from '@/lib/preferences-remote';
import { tenderApi } from '@/lib/api';
import { scoreTenders, type TenderMatch } from '@/lib/matches';
import { formatDate } from '@/lib/format';
import { PROVINCES, type TenderWithUserState } from '@/types/tender';
import type { TenderPreferences } from '@/types/preferences';
import {
  BBBEE_LEVELS, COMPANY_TYPES, COMPLETENESS_FIELDS, EMPTY_COMPANY_PROFILE,
  calculateCompleteness, getExpiryStatus, validateCompanyProfile,
  type BbbeeLevel, type CompanyProfile, type CompanyType, type ExpiryStatus, type FieldErrors,
} from '@/types/company';

/** Which edit section each profile field lives in (for "+Add" jumps). */
function groupOf(key: keyof CompanyProfile): string {
  if (key === 'legalName' || key === 'tradingName' || key === 'companyType') return 'identity';
  if (key === 'registrationNumber' || key === 'vatNumber' || key === 'csdNumber' || key === 'taxClearanceExpiry') return 'registration';
  if (key === 'bbbeeLevel' || key === 'bbbeeExpiry' || key === 'cidbGrading') return 'compliance';
  if (key === 'contactPerson' || key === 'phone' || key === 'email') return 'contact';
  return 'address';
}

const TOTAL_WEIGHT = COMPLETENESS_FIELDS.reduce((s, f) => s + f.weight, 0);

/** Real contribution of a field to the completeness percentage. */
function gainOf(key: keyof CompanyProfile): number {
  const w = COMPLETENESS_FIELDS.find((f) => f.key === key)?.weight ?? 0;
  return Math.max(1, Math.round((w / TOTAL_WEIGHT) * 100));
}

/**
 * Company profile.
 *
 * One screen, two modes. Read mode is the default because the profile is
 * mostly consulted, not edited; edit mode validates against the real CIPC,
 * SARS, CSD and CIDB formats so a malformed CSD number is caught here rather
 * than at bid submission.
 */
export function CompanyProfileView() {
  const router = useRouter();
  // Starts empty — the server and first client render agree, and a fresh
  // profile is shown as the honest empty state below, never a demo persona.
  const [profile, setProfile] = useState<CompanyProfile>(EMPTY_COMPANY_PROFILE);
  const [draft, setDraft] = useState<CompanyProfile | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showErrors, setShowErrors] = useState(false);
  const [toast, setToast] = useState(false);
  const [pendingKey, setPendingKey] = useState<keyof CompanyProfile | null>(null);
  const [flashGroup, setFlashGroup] = useState<string | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  // Postgres is the source of truth when signed in; localStorage is the
  // fallback for signed-out use and the preview bypass.
  useEffect(() => {
    let cancelled = false;
    setProfile(loadProfile());
    void fetchProfile().then((remote) => {
      if (!cancelled && remote) setProfile(remote);
    });
    return () => { cancelled = true; };
  }, []);

  const isEditing = draft !== null;
  const current = draft ?? profile;

  // "+Add" on the quality meter jumps into edit mode at the right section.
  useEffect(() => {
    if (!pendingKey) return;
    const group = groupOf(pendingKey);
    const t = window.setTimeout(() => {
      document.getElementById(`grp-${group}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setFlashGroup(group);
      window.setTimeout(() => {
        setFlashGroup(null);
        setPendingKey(null);
      }, 1400);
    }, 60);
    return () => window.clearTimeout(t);
  }, [pendingKey, isEditing]);

  const jumpTo = (key: keyof CompanyProfile) => {
    if (!isEditing) startEdit();
    setPendingKey(key);
  };

  // A profile with no real content gets the "set up" state instead of a wall
  // of empty read rows.
  const hasContent = Boolean(
    current.legalName?.trim() ||
      current.registrationNumber ||
      current.vatNumber ||
      current.csdNumber ||
      current.contactPerson?.trim() ||
      current.city?.trim(),
  );
  const emptyRead = !isEditing && !hasContent;

  const completeness = useMemo(() => calculateCompleteness(current), [current]);

  const taxStatus = getExpiryStatus(current.taxClearanceExpiry);
  const bbbeeStatus = getExpiryStatus(current.bbbeeExpiry);

  const set = <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    if (showErrors) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const startEdit = () => {
    setDraft({ ...current });
    setErrors({});
    setShowErrors(false);
  };

  const cancelEdit = () => {
    setDraft(null);
    setErrors({});
    setShowErrors(false);
  };

  const handleSave = () => {
    if (!draft) return;
    const found = validateCompanyProfile(draft);
    setErrors(found);
    setShowErrors(true);

    if (Object.keys(found).length > 0) {
      // Move the user to the problem rather than leaving them to hunt for it.
      requestAnimationFrame(() =>
        errorSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      );
      return;
    }

    // Write locally first so the UI is never blocked on the network, then
    // upsert. A failed remote write leaves the local copy intact.
    setProfile(saveProfile(draft));
    setDraft(null);
    setShowErrors(false);
    setToast(true);
    window.setTimeout(() => setToast(false), 2600);
    void persistProfile(draft);
  };

  const errorCount = Object.keys(errors).length;
  const err = (k: keyof CompanyProfile) => (showErrors ? errors[k] : undefined);

  return (
    <main className={cn(isEditing && 'pb-28')}>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-white px-4 py-2">
        <button
          onClick={() => (isEditing ? cancelEdit() : router.back())}
          aria-label={isEditing ? 'Cancel editing' : 'Go back'}
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-canvas text-ink"
        >
          {isEditing ? <X size={20} strokeWidth={2} aria-hidden /> : <ChevronLeft size={21} strokeWidth={1.75} aria-hidden />}
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center text-card-title font-semibold tracking-[-0.02em]">
          Company Profile
        </h1>
        <button
          onClick={isEditing ? handleSave : startEdit}
          className="shrink-0 rounded-[9px] px-2 py-1.5 text-[14.5px] font-semibold text-blue"
        >
          {isEditing ? 'Save' : emptyRead ? 'Set up' : 'Edit'}
        </button>
      </header>

      {emptyRead && (
        <div className="px-5 pt-3.5">
          <section className="flex flex-col items-center rounded-lg border border-dashed border-line bg-white px-5 py-10 text-center">
            <span className="mb-3.5 flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-blue-soft text-navy">
              <Building2 size={24} strokeWidth={1.8} aria-hidden />
            </span>
            <h2 className="text-card-title font-semibold tracking-[-0.02em] text-ink">
              Build your company profile
            </h2>
            <p className="mt-1.5 max-w-[280px] text-meta leading-5 text-ink-2">
              Your company details (CIPC, SARS, CSD, CIDB) qualify you for bids
              and let TenderBase match the tenders that actually fit you.
            </p>
            <Button size="sm" className="mt-4" onClick={startEdit}>
              Set up profile
            </Button>
          </section>
          <p className="mt-3 text-center text-caption text-ink-3">
            Nothing is stored until you save — and saved details stay private to your account.
          </p>
        </div>
      )}

      {!emptyRead && <div className="px-5 pt-3.5">
        {/* Identity + completeness */}
        <section className="rounded-lg border border-line bg-white p-3.5 shadow-card-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[13px] bg-blue-soft text-navy">
              <Building2 size={22} strokeWidth={1.9} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16.5px] font-bold tracking-[-0.03em]">
                {current.legalName || 'Unnamed company'}
              </p>
              <p className="mt-0.5 truncate text-meta text-ink-2">
                {[current.city, current.province].filter(Boolean).join(', ') || 'No location set'}
              </p>
            </div>
          </div>

          <div className="mt-3 border-t border-line pt-3">
            <div className="flex items-center gap-2">
              {completeness.percent === 100 ? (
                <CheckCircle2 size={15} strokeWidth={2.2} className="shrink-0 text-open" aria-hidden />
              ) : (
                <Info size={15} strokeWidth={2.2} className="shrink-0 text-soon" aria-hidden />
              )}
              <p className="text-[13px] text-ink-2">
                <span className="font-semibold text-ink">Profile {completeness.percent}% complete</span>
                {completeness.missing.length > 0 && (
                  <> — add {completeness.missing.slice(0, 2).map((m) => m.label).join(' and ')}</>
                )}
              </p>
            </div>
            <div
              role="progressbar"
              aria-valuenow={completeness.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Profile completeness"
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"
            >
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none',
                  completeness.percent === 100 ? 'bg-open' : completeness.percent >= 60 ? 'bg-open' : 'bg-soon',
                )}
                style={{ width: `${completeness.percent}%` }}
              />
            </div>
          </div>
        </section>

        {/* Compliance warnings — these disqualify bids, so they lead */}
        {(taxStatus === 'expired' || taxStatus === 'expiring' || bbbeeStatus === 'expired') && !isEditing && (
          <div
            role="alert"
            className={cn(
              'mt-3 flex items-start gap-2.5 rounded-[12px] border px-3 py-2.5',
              taxStatus === 'expired' || bbbeeStatus === 'expired'
                ? 'border-urgent/25 bg-urgent-bg'
                : 'border-soon/25 bg-soon-bg',
            )}
          >
            <AlertTriangle
              size={15}
              strokeWidth={2.1}
              className={cn(
                'mt-px shrink-0',
                taxStatus === 'expired' || bbbeeStatus === 'expired' ? 'text-urgent' : 'text-soon',
              )}
              aria-hidden
            />
            <p className="text-[11.5px] leading-[1.45] text-ink-2">
              {taxStatus === 'expired'
                ? 'Your tax clearance has expired. Most organs of state will reject a bid without a valid certificate.'
                : bbbeeStatus === 'expired'
                  ? 'Your B-BBEE certificate has expired — you will score zero preference points until it is renewed.'
                  : 'Your tax clearance expires within 30 days. Renew it before submitting further bids.'}
            </p>
          </div>
        )}

        {showErrors && errorCount > 0 && (
          <div
            ref={errorSummaryRef}
            role="alert"
            className="mt-3 rounded-[12px] border border-urgent/25 bg-urgent-bg px-3 py-2.5"
          >
            <p className="text-[12.5px] font-semibold text-urgent">
              {errorCount} {errorCount === 1 ? 'field needs' : 'fields need'} attention
            </p>
            <p className="mt-0.5 text-[11.5px] text-ink-2">
              Correct the highlighted fields below, then save again.
            </p>
          </div>
        )}

        {isEditing ? (
          <EditForm profile={current} set={set} err={err} flashGroup={flashGroup} />
        ) : (
          <ReadView profile={current} taxStatus={taxStatus} bbbeeStatus={bbbeeStatus} />
        )}

        {/* Match-quality meter: real missing fields, real percentage gains */}
        <section className="mt-3.5 rounded-lg border border-line bg-white p-3.5 shadow-card-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-1.5 text-[14px] font-bold tracking-[-0.01em] text-ink">
              <Sparkles size={15} strokeWidth={2} className="text-ai" aria-hidden />
              Match quality
            </h2>
            <span className="text-[13px] font-bold tabular-nums text-ink">{completeness.percent}%</span>
          </div>
          <p className="mt-0.5 text-[11.5px] leading-[16px] text-ink-3">
            What the match engine reads about your business — completeness, not a promise.
          </p>

          {completeness.missing.length === 0 ? (
            <p className="mt-3 flex items-center gap-1.5 rounded-[10px] bg-open-bg px-3 py-2 text-[12.5px] font-semibold text-open">
              <CheckCircle2 size={14} strokeWidth={2.2} aria-hidden />
              Every weighted field is filled in.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-line border-t border-line">
              {[...completeness.missing]
                .sort((a, b) => gainOf(b.key) - gainOf(a.key))
                .slice(0, 5)
                .map((m) => (
                  <li key={m.key}>
                    <button
                      type="button"
                      onClick={() => jumpTo(m.key)}
                      className="flex w-full items-center gap-2 py-2 text-left"
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{m.label}</span>
                      <span className="shrink-0 rounded-[6px] bg-canvas px-1.5 py-0.5 text-[10.5px] font-bold text-ink-3">
                        +{gainOf(m.key)}%
                      </span>
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] bg-blue-soft text-blue">
                        <Plus size={13} strokeWidth={2.4} aria-hidden />
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
          {completeness.missing.length > 5 && (
            <p className="mt-1.5 text-[11px] text-ink-3">
              +{completeness.missing.length - 5} more — keep going, every field counts.
            </p>
          )}
        </section>

        {/* Compliance status chips — valid / expiring / expired, live from the form */}
        <section className="mt-3.5 rounded-lg border border-line bg-white px-3.5 py-3 shadow-card-sm">
          <h2 className="flex items-center gap-1.5 text-[14px] font-bold tracking-[-0.01em] text-ink">
            <ShieldCheck size={15} strokeWidth={2} className="text-navy" aria-hidden />
            Compliance status
          </h2>
          <ul className="mt-2 space-y-2">
            <ComplianceRow
              label="Tax clearance"
              iso={current.taxClearanceExpiry}
              status={getExpiryStatus(current.taxClearanceExpiry)}
              onAdd={() => jumpTo('taxClearanceExpiry')}
            />
            <ComplianceRow
              label="B-BBEE certificate"
              iso={current.bbbeeExpiry}
              status={getExpiryStatus(current.bbbeeExpiry)}
              onAdd={() => jumpTo('bbbeeExpiry')}
            />
            {current.cidbGrading?.trim() ? (
              <li className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-ink">CIDB grading</span>
                <span className="rounded-[6px] bg-canvas px-2 py-0.5 text-[11.5px] font-bold text-ink-2">
                  {current.cidbGrading} · no expiry date on file
                </span>
              </li>
            ) : (
              <ComplianceRow
                label="CIDB grading"
                iso={null}
                status="missing"
                onAdd={() => jumpTo('cidbGrading')}
              />
            )}
          </ul>
        </section>

        <LiveMatchPreview profile={current} />

        {!isEditing && !emptyRead && (
          <p className="mb-2 mt-4 text-center text-[11px] text-ink-3">
            Last updated {formatDate(current.updatedAt)}
          </p>
        )}
        </div>
      }

      {isEditing && (
        <div className="fixed inset-x-0 bottom-[76px] z-30 border-t border-line bg-white px-5 py-3 md:bottom-0 md:pl-[calc(15rem+1.25rem)]">
          <div className="mx-auto flex max-w-3xl gap-2.5 md:max-w-5xl">
            <Button variant="secondary" className="flex-1" onClick={cancelEdit}>
              Cancel
            </Button>
            <Button className="flex-[1.6]" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      )}

      <SavedToast show={toast} />
    </main>
  );
}

// ---------------------------------------------------------------------------

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-3.5">
      <h2 className="mb-1.5 px-0.5 text-micro font-semibold uppercase tracking-[0.07em] text-ink-3">
        {title}
      </h2>
      <dl className="divide-y divide-line rounded-[14px] border border-line bg-white px-3.5">
        {children}
      </dl>
    </section>
  );
}

function EditGroup({
  title,
  id,
  flash = false,
  children,
}: {
  title: string;
  id: string;
  flash?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={`grp-${id}`} className="mt-3.5 scroll-mt-24">
      <h2 className="mb-1.5 px-0.5 text-micro font-semibold uppercase tracking-[0.07em] text-ink-3">
        {title}
      </h2>
      <div
        className={cn(
          'divide-y divide-line rounded-[14px] border bg-white px-3.5 transition-shadow',
          flash ? 'border-ai shadow-[0_0_0_3px_rgba(74,85,184,0.18)]' : 'border-line',
        )}
      >
        {children}
      </div>
    </section>
  );
}

function expiryTone(status: ExpiryStatus) {
  return status === 'expired' ? 'urgent' : status === 'expiring' ? 'soon' : 'open';
}

function expiryLabel(iso: string | null, status: ExpiryStatus) {
  if (!iso) return null;
  if (status === 'expired') return `Expired ${formatDate(iso)}`;
  return `Valid to ${formatDate(iso)}`;
}

function ReadView({
  profile,
  taxStatus,
  bbbeeStatus,
}: {
  profile: CompanyProfile;
  taxStatus: ExpiryStatus;
  bbbeeStatus: ExpiryStatus;
}) {
  return (
    <>
      <Group title="Registration details">
        <ReadRow label="Registration No." value={profile.registrationNumber} />
        <ReadRow label="VAT Number" value={profile.vatNumber} />
        <ReadRow label="CSD Number" value={profile.csdNumber} />
        <ReadRow
          label="Tax Clearance"
          value={expiryLabel(profile.taxClearanceExpiry, taxStatus)}
          tone={expiryTone(taxStatus)}
        />
      </Group>

      <Group title="Compliance">
        <ReadRow
          label="B-BBEE Level"
          value={profile.bbbeeLevel ? `Level ${profile.bbbeeLevel}` : null}
        />
        <ReadRow
          label="B-BBEE Certificate"
          value={expiryLabel(profile.bbbeeExpiry, bbbeeStatus)}
          tone={expiryTone(bbbeeStatus)}
        />
        <ReadRow label="CIDB Grading" value={profile.cidbGrading} />
        <ReadRow label="Company Type" value={profile.companyType} />
      </Group>

      <Group title="Contact">
        <ReadRow label="Contact Person" value={profile.contactPerson} />
        <ReadRow label="Phone" value={profile.phone} />
        <ReadRow label="Email" value={profile.email} />
      </Group>

      <Group title="Address">
        <ReadRow label="Street" value={profile.addressLine} />
        <ReadRow label="City" value={profile.city} />
        <ReadRow label="Province" value={profile.province} />
        <ReadRow label="Postal Code" value={profile.postalCode} />
      </Group>
    </>
  );
}

function EditForm({
  profile,
  set,
  err,
  flashGroup,
}: {
  profile: CompanyProfile;
  set: <K extends keyof CompanyProfile>(k: K, v: CompanyProfile[K]) => void;
  err: (k: keyof CompanyProfile) => string | undefined;
  flashGroup: string | null;
}) {
  return (
    <>
      <EditGroup title="Identity" id="identity" flash={flashGroup === 'identity'}>
        <TextField
          label="Registered company name"
          required
          value={profile.legalName}
          onChange={(v) => set('legalName', v)}
          error={err('legalName')}
          placeholder="e.g. Sizwe Construction (Pty) Ltd"
          autoComplete="organization"
        />
        <TextField
          label="Trading name"
          value={profile.tradingName ?? ''}
          onChange={(v) => set('tradingName', v || null)}
          hint="Only if you trade under a different name"
        />
        <SelectField<CompanyType>
          label="Company type"
          value={profile.companyType}
          onChange={(v) => set('companyType', v)}
          options={COMPANY_TYPES.map((t) => ({ value: t, label: t }))}
        />
      </EditGroup>

      <EditGroup title="Registration details" id="registration" flash={flashGroup === "registration"}>
        <TextField
          label="Registration number"
          value={profile.registrationNumber ?? ''}
          onChange={(v) => set('registrationNumber', v || null)}
          error={err('registrationNumber')}
          hint="CIPC format: 2018/443921/07"
          placeholder="2018/443921/07"
          inputMode="numeric"
        />
        <TextField
          label="VAT number"
          value={profile.vatNumber ?? ''}
          onChange={(v) => set('vatNumber', v || null)}
          error={err('vatNumber')}
          hint="10 digits, starting with 4"
          placeholder="4820318877"
          inputMode="numeric"
          maxLength={10}
        />
        <TextField
          label="CSD number"
          value={profile.csdNumber ?? ''}
          onChange={(v) => set('csdNumber', v ? v.toUpperCase() : null)}
          error={err('csdNumber')}
          hint="Central Supplier Database — required by all organs of state"
          placeholder="MAAA0891234"
          maxLength={11}
        />
        <DateField
          label="Tax clearance expires"
          value={profile.taxClearanceExpiry}
          onChange={(v) => set('taxClearanceExpiry', v)}
          error={err('taxClearanceExpiry')}
        />
      </EditGroup>

      <EditGroup title="Compliance" id="compliance" flash={flashGroup === "compliance"}>
        <SelectField<BbbeeLevel>
          label="B-BBEE level"
          value={profile.bbbeeLevel}
          onChange={(v) => set('bbbeeLevel', v)}
          options={BBBEE_LEVELS.map((l) => ({ value: l, label: `Level ${l}` }))}
          hint="Drives your preference points under 80/20 and 90/10"
        />
        <DateField
          label="B-BBEE certificate expires"
          value={profile.bbbeeExpiry}
          onChange={(v) => set('bbbeeExpiry', v)}
          error={err('bbbeeExpiry')}
        />
        <TextField
          label="CIDB grading"
          value={profile.cidbGrading ?? ''}
          onChange={(v) => set('cidbGrading', v ? v.toUpperCase() : null)}
          error={err('cidbGrading')}
          hint="Required for construction tenders, e.g. 6GB"
          placeholder="6GB"
          maxLength={8}
        />
      </EditGroup>

      <EditGroup title="Contact" id="contact" flash={flashGroup === "contact"}>
        <TextField
          label="Contact person"
          value={profile.contactPerson ?? ''}
          onChange={(v) => set('contactPerson', v || null)}
          autoComplete="name"
        />
        <TextField
          label="Phone"
          value={profile.phone ?? ''}
          onChange={(v) => set('phone', v || null)}
          error={err('phone')}
          placeholder="+27 31 502 8841"
          inputMode="tel"
          autoComplete="tel"
        />
        <TextField
          label="Email"
          value={profile.email ?? ''}
          onChange={(v) => set('email', v || null)}
          error={err('email')}
          placeholder="info@company.co.za"
          inputMode="email"
          autoComplete="email"
        />
      </EditGroup>

      <EditGroup title="Address" id="address" flash={flashGroup === "address"}>
        <TextField
          label="Street address"
          value={profile.addressLine ?? ''}
          onChange={(v) => set('addressLine', v || null)}
          autoComplete="street-address"
        />
        <TextField
          label="City"
          value={profile.city ?? ''}
          onChange={(v) => set('city', v || null)}
          autoComplete="address-level2"
        />
        <SelectField<string>
          label="Province"
          value={profile.province}
          onChange={(v) => set('province', v)}
          options={PROVINCES.filter((p) => p !== 'National').map((p) => ({ value: p, label: p }))}
        />
        <TextField
          label="Postal code"
          value={profile.postalCode ?? ''}
          onChange={(v) => set('postalCode', v || null)}
          error={err('postalCode')}
          inputMode="numeric"
          maxLength={4}
          placeholder="4001"
        />
      </EditGroup>
    </>
  );
}

/* ---------------- compliance chip rows ---------------- */

function ComplianceRow({
  label,
  iso,
  status,
  onAdd,
}: {
  label: string;
  iso: string | null;
  status: ExpiryStatus;
  onAdd: () => void;
}) {
  const days = daysUntilText(iso);
  let chip: { text: string; cls: string; button?: boolean } | null = null;
  if (status === 'missing') {
    chip = { text: 'Not added', cls: 'border border-dashed border-line bg-white text-ink-3', button: true };
  } else if (status === 'valid') {
    chip = { text: iso ? `Valid to ${formatDate(iso)}` : 'Valid', cls: 'bg-open-bg text-open' };
  } else if (status === 'expiring') {
    chip = { text: iso ? `Expires in ${days} day${days === 1 ? '' : 's'} · ${formatDate(iso)}` : 'Expiring', cls: 'bg-soon-bg text-soon' };
  } else {
    chip = { text: iso ? `Expired · ${formatDate(iso)}` : 'Expired', cls: 'bg-urgent-bg text-urgent' };
  }

  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-ink">{label}</span>
      {chip.button ? (
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 rounded-[6px] border border-dashed border-line px-2 py-0.5 text-[11.5px] font-semibold text-ink-3"
        >
          <Plus size={11} strokeWidth={2.4} aria-hidden />
          {chip.text}
        </button>
      ) : (
        <span className={cn('rounded-[6px] px-2 py-0.5 text-[11.5px] font-bold', chip.cls)}>{chip.text}</span>
      )}
    </li>
  );
}

function daysUntilText(iso: string | null): number {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/* ---------------- live match preview ---------------- */

/**
 * The §5.10 wow moment — but honest: the top 3 matching tenders are scored
 * by the same transparent v0 engine Today uses, over the newest catalogue,
 * against the profile exactly as it stands in the form right now. It
 * refreshes as you type (debounced) and every score is explainable.
 */
function LiveMatchPreview({ profile }: { profile: CompanyProfile }) {
  const [prefs, setPrefs] = useState<TenderPreferences | null>(null);
  const [tenders, setTenders] = useState<TenderWithUserState[] | null>(null);
  const [matches, setMatches] = useState<TenderMatch[] | null>(null);
  const [failed, setFailed] = useState(false);
  const ready = tenders !== null && prefs !== null;

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const [local, remote, page] = await Promise.all([
        Promise.resolve(loadPreferences()).catch(() => null),
        fetchPreferences().catch(() => null),
        tenderApi.list({ sort: 'newest', limit: 100 }).catch(() => null),
      ]);
      if (cancelled) return;
      if (page === null) {
        setFailed(true);
        return;
      }
      setPrefs(remote ?? local ?? ({} as TenderPreferences));
      setTenders(page.results);
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => {
      setMatches(
        scoreTenders(tenders ?? [], { profile, preferences: prefs }, { limit: 3, minScore: 15 }),
      );
    }, 450);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, profile, prefs]);

  const hasLocation = Boolean(profile.city?.trim() || profile.province?.trim());
  const hasSignals = hasLocation || Boolean(prefs?.categories?.length || prefs?.provinces?.length);

  return (
    <section className="mt-3.5 overflow-hidden rounded-lg border border-line bg-white shadow-card-sm">
      <header className="flex items-start gap-2.5 px-3.5 pt-3.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-ai-bg text-ai">
          <Sparkles size={14} strokeWidth={2.1} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-bold tracking-[-0.01em] text-ink">Live match preview</h2>
          <p className="mt-0.5 text-[11.5px] leading-[16px] text-ink-3">
            Top tenders for the profile as it stands — refreshes as you edit.
          </p>
        </div>
      </header>

      <div className="px-3.5 pb-3.5 pt-2">
        {failed ? (
          <p className="rounded-[12px] border border-dashed border-line px-3 py-4 text-center text-[12.5px] leading-[18px] text-ink-2">
            The tender service is unreachable right now — the preview will return once it is.
          </p>
        ) : !ready ? (
          <div className="space-y-2" aria-hidden>
            {[0, 1].map((i) => (
              <div key={i} className="h-[52px] animate-pulse rounded-[12px] bg-canvas" />
            ))}
          </div>
        ) : !hasSignals ? (
          <div className="rounded-[12px] border border-dashed border-line px-3 py-4 text-center">
            <p className="text-[12.5px] leading-[18px] text-ink-2">
              Add your city or province here — and pick categories in{' '}
              <Link href="/profile/preferences" className="font-semibold text-blue underline-offset-2 hover:underline">
                Tender preferences
              </Link>{' '}
              — and the newest tenders start matching below.
            </p>
          </div>
        ) : matches === null ? (
          <div className="space-y-2" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[52px] animate-pulse rounded-[12px] bg-canvas" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <p className="rounded-[12px] border border-dashed border-line px-3 py-4 text-center text-[12.5px] leading-[18px] text-ink-2">
            No strong matches in the newest tenders right now — scores climb as the profile fills in.
          </p>
        ) : (
          <ul className="space-y-2">
            {matches.map((m) => (
              <li key={m.tender.id}>
                <Link
                  href={`/tenders/${m.tender.id}`}
                  className="flex items-center gap-2.5 rounded-[12px] border border-line bg-white px-2.5 py-2"
                >
                  <ScoreRing score={m.score} size={38} strokeWidth={3.5} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold leading-[17px] tracking-[-0.015em] text-ink">
                      {m.tender.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-ink-3">{m.tender.organisation}</span>
                  </span>
                  <span className="shrink-0">
                    <DeadlineBadge closingDate={m.tender.closingDate} lifecycleStatus={m.tender.lifecycleStatus} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[10.5px] leading-[14px] text-ink-3">
          Same transparent signals as Today&apos;s Matches — every score is explainable.
        </p>
      </div>
    </section>
  );
}
