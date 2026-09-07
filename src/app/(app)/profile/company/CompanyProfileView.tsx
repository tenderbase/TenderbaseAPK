'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Building2, AlertTriangle, CheckCircle2, Info, X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { DateField, ReadRow, SavedToast, SelectField, TextField } from '@/components/company/Field';
import { DEMO_PROFILE, loadProfile, saveProfile } from '@/lib/company';
import { fetchProfile, persistProfile } from '@/lib/company-remote';
import { formatDate } from '@/lib/format';
import { PROVINCES } from '@/types/tender';
import {
  BBBEE_LEVELS, COMPANY_TYPES, calculateCompleteness, getExpiryStatus,
  validateCompanyProfile,
  type BbbeeLevel, type CompanyProfile, type CompanyType, type ExpiryStatus, type FieldErrors,
} from '@/types/company';

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
  // Seeded with the demo profile so the server and the first client render
  // agree (no hydration mismatch) and the page has real content before JS.
  const [profile, setProfile] = useState<CompanyProfile>(DEMO_PROFILE);
  const [draft, setDraft] = useState<CompanyProfile | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showErrors, setShowErrors] = useState(false);
  const [toast, setToast] = useState(false);
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
          {isEditing ? 'Save' : 'Edit'}
        </button>
      </header>

      <div className="px-5 pt-3.5">
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
          <EditForm profile={current} set={set} err={err} />
        ) : (
          <ReadView profile={current} taxStatus={taxStatus} bbbeeStatus={bbbeeStatus} />
        )}

        {!isEditing && (
          <p className="mb-2 mt-4 text-center text-[11px] text-ink-3">
            Last updated {formatDate(current.updatedAt)}
          </p>
        )}
      </div>

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

function EditGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-3.5">
      <h2 className="mb-1.5 px-0.5 text-micro font-semibold uppercase tracking-[0.07em] text-ink-3">
        {title}
      </h2>
      <div className="divide-y divide-line rounded-[14px] border border-line bg-white px-3.5">
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
}: {
  profile: CompanyProfile;
  set: <K extends keyof CompanyProfile>(k: K, v: CompanyProfile[K]) => void;
  err: (k: keyof CompanyProfile) => string | undefined;
}) {
  return (
    <>
      <EditGroup title="Identity">
        <TextField
          label="Registered company name"
          required
          value={profile.legalName}
          onChange={(v) => set('legalName', v)}
          error={err('legalName')}
          placeholder="Mkhize Solutions (Pty) Ltd"
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

      <EditGroup title="Registration details">
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

      <EditGroup title="Compliance">
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

      <EditGroup title="Contact">
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

      <EditGroup title="Address">
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
