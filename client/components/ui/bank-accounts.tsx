'use client';

import { useEffect, useMemo } from 'react';
import { useFieldArray } from 'react-hook-form';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReusableSelect } from '@/components/ui/reusable-select';
import { FormInput } from '@/components/ui/form-input';

// Import bank SVGs directly for robust bundler compatibility
import bcaLogo from 'idn-finlogos/icons/bca';
import mandiriLogo from 'idn-finlogos/icons/mandiri';
import briLogo from 'idn-finlogos/icons/bri';
import bniLogo from 'idn-finlogos/icons/bni';
import bsiLogo from 'idn-finlogos/icons/bsi';
import cimbLogo from 'idn-finlogos/icons/cimb-niaga';
import jagoLogo from 'idn-finlogos/icons/jago';
import seabankLogo from 'idn-finlogos/icons/seabank';
import danamonLogo from 'idn-finlogos/icons/danamon';
import permataLogo from 'idn-finlogos/icons/permata';
import btnLogo from 'idn-finlogos/icons/btn';
import ocbcLogo from 'idn-finlogos/icons/ocbc-nisp';
import paninLogo from 'idn-finlogos/icons/panin-bank';
import maybankLogo from 'idn-finlogos/icons/maybank';
import megaLogo from 'idn-finlogos/icons/mega';
import sinarmasLogo from 'idn-finlogos/icons/sinarmas';
import bukopinLogo from 'idn-finlogos/icons/kb-bukopin';
import bcaSyariahLogo from 'idn-finlogos/icons/bca-syariah';
import muamalatLogo from 'idn-finlogos/icons/muamalat';
import paninSyariahLogo from 'idn-finlogos/icons/panin-dubai-syariah';
import bankSumutLogo from 'idn-finlogos/icons/bank-sumut';
import bankAcehLogo from 'idn-finlogos/icons/bank-aceh';
import bankAcehSyariahLogo from 'idn-finlogos/icons/bank-aceh-syariah';
import bankDkiLogo from 'idn-finlogos/icons/bank-dki';
import bankBjbLogo from 'idn-finlogos/icons/bank-bjb';

export const logoMap: Record<string, any> = {
  bca: bcaLogo,
  mandiri: mandiriLogo,
  bri: briLogo,
  bni: bniLogo,
  bsi: bsiLogo,
  'cimb-niaga': cimbLogo,
  jago: jagoLogo,
  seabank: seabankLogo,
  danamon: danamonLogo,
  permata: permataLogo,
  btn: btnLogo,
  'ocbc-nisp': ocbcLogo,
  'panin-bank': paninLogo,
  maybank: maybankLogo,
  mega: megaLogo,
  sinarmas: sinarmasLogo,
  'kb-bukopin': bukopinLogo,
  'bca-syariah': bcaSyariahLogo,
  muamalat: muamalatLogo,
  'panin-dubai-syariah': paninSyariahLogo,
  'bank-sumut': bankSumutLogo,
  'bank-aceh': bankAcehLogo,
  'bank-aceh-syariah': bankAcehSyariahLogo,
  'bank-dki': bankDkiLogo,
  'bank-bjb': bankBjbLogo
};

export const getSvgString = (logo: any): string => {
  if (typeof logo === 'string') return logo;
  if (logo && typeof logo === 'object') {
    if (typeof logo.default === 'string') return logo.default;
    if (
      typeof logo.default === 'object' &&
      typeof logo.default.src === 'string'
    )
      return logo.default.src;
  }
  return '';
};

interface BankAccountsProps {
  form?: any;
  bankOptions?: { label: string; value: string }[];
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
  value?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    isDefault?: boolean;
  }[];
  selectedBankName?: string;
  selectedBankAccount?: string;
  onSelect?: (bankName: string, bankAccount: string) => void;
}

interface BankAccountsListProps {
  bankAccounts: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    isDefault?: boolean;
  }[];
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
  selectedBankName?: string;
  selectedBankAccount?: string;
  onSelect?: (bankName: string, bankAccount: string) => void;
  form?: any;
  sortedOptions?: { label: string; value: string }[];
  onRemove?: (index: number) => void;
  onSetDefault?: (index: number) => void;
}

// Silver Credit Card Chip SVG
const CardChip = () => (
  <svg className="w-10 h-8 opacity-80" viewBox="0 0 50 38" fill="none">
    <rect
      x="2"
      y="2"
      width="46"
      height="34"
      rx="6"
      fill="url(#chip-grad)"
      stroke="#d1d5db"
      strokeWidth="1"
    />
    <path d="M2 14 H16 V24 H2" stroke="#9ca3af" strokeWidth="1" />
    <path d="M34 14 H48 V24 H34" stroke="#9ca3af" strokeWidth="1" />
    <path d="M16 2 H16 V36" stroke="#9ca3af" strokeWidth="1" />
    <path d="M34 2 H34 V36" stroke="#9ca3af" strokeWidth="1" />
    <path d="M16 14 H34" stroke="#9ca3af" strokeWidth="1" />
    <path d="M16 24 H34" stroke="#9ca3af" strokeWidth="1" />
    <defs>
      <linearGradient
        id="chip-grad"
        x1="0"
        y1="0"
        x2="50"
        y2="38"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#e5e7eb" />
        <stop offset="0.5" stopColor="#9ca3af" />
        <stop offset="1" stopColor="#d1d5db" />
      </linearGradient>
    </defs>
  </svg>
);

export const getBankSlug = (bankName: string): string => {
  const nameLower = (bankName || '').toLowerCase();

  // 1. BCA
  if (nameLower.includes('bca syariah')) return 'bca-syariah';
  if (nameLower.includes('bca') || nameLower.includes('central asia'))
    return 'bca';

  // 2. Mandiri
  if (nameLower.includes('mandiri syariah')) return 'bsi'; // Syariah merger to BSI
  if (nameLower.includes('mandiri')) return 'mandiri';

  // 3. BRI
  if (nameLower.includes('bri syariah')) return 'bsi'; // Syariah merger to BSI
  if (nameLower.includes('bri') || nameLower.includes('rakyat indonesia'))
    return 'bri';

  // 4. BNI
  if (nameLower.includes('bni syariah')) return 'bsi'; // Syariah merger to BSI
  if (nameLower.includes('bni') || nameLower.includes('negara indonesia'))
    return 'bni';

  // 5. CIMB Niaga
  if (nameLower.includes('cimb') || nameLower.includes('niaga'))
    return 'cimb-niaga';

  // 6. BTN
  if (nameLower.includes('btn') || nameLower.includes('tabungan negara'))
    return 'btn';

  // 7. Danamon
  if (nameLower.includes('danamon')) return 'danamon';

  // 8. Permata
  if (nameLower.includes('permata')) return 'permata';

  // 9. OCBC
  if (nameLower.includes('ocbc') || nameLower.includes('nisp'))
    return 'ocbc-nisp';

  // 10. Panin
  if (nameLower.includes('panin syariah') || nameLower.includes('panin dubai'))
    return 'panin-dubai-syariah';
  if (nameLower.includes('panin')) return 'panin-bank';

  // 11. Maybank
  if (nameLower.includes('maybank')) return 'maybank';

  // 12. Mega
  if (nameLower.includes('mega')) return 'mega';

  // 13. Sinarmas
  if (nameLower.includes('sinarmas')) return 'sinarmas';

  // 14. Bukopin
  if (nameLower.includes('bukopin')) return 'kb-bukopin';

  // 15. SeaBank
  if (nameLower.includes('seabank') || nameLower.includes('sea bank'))
    return 'seabank';

  // 16. Jago
  if (nameLower.includes('jago')) return 'jago';

  // 18. BSI
  if (nameLower.includes('bsi') || nameLower.includes('syariah indonesia'))
    return 'bsi';

  // 19. Muamalat
  if (nameLower.includes('muamalat')) return 'muamalat';

  // 24. Bank Sumut
  if (nameLower.includes('sumut')) return 'bank-sumut';

  // 25. Bank Aceh & Bank Aceh Syariah
  if (nameLower.includes('aceh syariah')) return 'bank-aceh-syariah';
  if (nameLower.includes('aceh')) return 'bank-aceh';

  // 27. Bank DKI
  if (nameLower.includes('dki')) return 'bank-dki';

  // 28. Bank BJB
  if (nameLower.includes('bjb')) return 'bank-bjb';

  return '';
};

const getBankCardGradient = (slug: string): string => {
  switch (slug) {
    case 'bca':
      return 'bg-gradient-to-tr from-[#0a3563] via-[#0f4c8a] to-[#cbdcf4]';
    case 'mandiri':
      return 'bg-gradient-to-tr from-[#003b6f] via-[#05579e] to-[#ffc526]/50';
    case 'bri':
      return 'bg-gradient-to-tr from-[#00529c] via-[#006cc0] to-[#80c2f1]';
    case 'bni':
      return 'bg-gradient-to-tr from-[#005e66] via-[#00828a] to-[#ffaa73]';
    case 'bsi':
      return 'bg-gradient-to-tr from-[#005d52] via-[#028476] to-[#d4af37]/40';
    case 'cimb-niaga':
      return 'bg-gradient-to-tr from-[#7a0000] via-[#a30000] to-[#ff8c8c]';
    case 'jago':
      return 'bg-gradient-to-tr from-[#ff4a4a] via-[#ff7849] to-[#ffc75f]';
    case 'seabank':
      return 'bg-gradient-to-tr from-[#ff5722] via-[#ff7043] to-[#ffe082]';
    case 'danamon':
      return 'bg-gradient-to-tr from-[#e85323] via-[#f26c3f] to-[#ffcda2]';
    case 'permata':
      return 'bg-gradient-to-tr from-[#007a33] via-[#009639] to-[#8dc63f]/40';
    case 'btn':
      return 'bg-gradient-to-tr from-[#003366] via-[#004080] to-[#ffc526]/40';
    case 'ocbc-nisp':
      return 'bg-gradient-to-tr from-[#9b111e] via-[#b22222] to-[#e6e6e6]/30';
    case 'panin-bank':
      return 'bg-gradient-to-tr from-[#003b46] via-[#07575b] to-[#66a5ad]/40';
    case 'maybank':
      return 'bg-gradient-to-tr from-[#111111] via-[#2d2d2d] to-[#ffcc00]/50';
    case 'mega':
      return 'bg-gradient-to-tr from-[#02475e] via-[#0f3057] to-[#f0a500]/40';
    case 'sinarmas':
      return 'bg-gradient-to-tr from-[#b80d0d] via-[#10316b] to-[#e4a054]/40';
    case 'kb-bukopin':
      return 'bg-gradient-to-tr from-[#005c31] via-[#008f4c] to-[#f6d55c]/40';
    case 'bca-syariah':
      return 'bg-gradient-to-tr from-[#005f73] via-[#0a9396] to-[#94d2bd]/40';
    case 'muamalat':
      return 'bg-gradient-to-tr from-[#4a0e4e] via-[#6f2c91] to-[#e3a857]/40';
    case 'panin-dubai-syariah':
      return 'bg-gradient-to-tr from-[#004b23] via-[#38b000] to-[#ffd700]/30';
    case 'bank-sumut':
      return 'bg-gradient-to-tr from-[#a06d02] via-[#cca43b] to-[#1d3557]/40';
    case 'bank-aceh':
      return 'bg-gradient-to-tr from-[#1b1c1e] via-[#a30000] to-[#e5a93b]/40';
    case 'bank-aceh-syariah':
      return 'bg-gradient-to-tr from-[#0f3427] via-[#2a7b5d] to-[#e5a93b]/40';
    case 'bank-dki':
      return 'bg-gradient-to-tr from-[#cc1b1b] via-[#e55934] to-[#f7b05b]/40';
    case 'bank-bjb':
      return 'bg-gradient-to-tr from-[#0d3b66] via-[#05668d] to-[#f4d35e]/50';
    default:
      return 'bg-gradient-to-tr from-[#1a202c] via-[#2d3748] to-[#4a5568]';
  }
};

const getBankCardStyle = (bankName: string) => {
  const slug = getBankSlug(bankName);
  const bgClass = getBankCardGradient(slug);
  const rawLogo = slug ? logoMap[slug] : null;
  const svgString = getSvgString(rawLogo);

  return {
    bgClass,
    textColor: 'text-white',
    logo: svgString ? (
      <div
        className="flex items-center justify-center bg-white/95 px-2.5 py-1 rounded-sm shadow-sm h-7 max-w-[90px] [&>svg]:h-5 [&>svg]:w-auto [&>svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: svgString }}
      />
    ) : (
      <div className="flex items-center space-x-1 bg-white/10 px-2 py-1 rounded-sm border border-white/15">
        <svg
          className="w-3.5 h-3.5 text-white/80"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
        <span className="font-extrabold tracking-wider text-[10px] uppercase">
          {bankName || 'BANK'}
        </span>
      </div>
    )
  };
};

const top10Banks = [
  'Bank Mandiri',
  'Bank Rakyat Indonesia (BRI)',
  'Bank Central Asia (BCA)',
  'Bank Negara Indonesia (BNI)',
  'Bank Syariah Indonesia (BSI)',
  'CIMB Niaga',
  'Bank Tabungan Negara (BTN)',
  'Bank Danamon',
  'Bank Permata',
  'OCBC NISP'
];

const getSortedBankOptions = (options: { label: string; value: string }[]) => {
  const topOptions: { label: string; value: string }[] = [];
  const otherOptions: { label: string; value: string }[] = [];

  options.forEach((opt) => {
    const index = top10Banks.findIndex(
      (b) => b.toLowerCase() === opt.label.toLowerCase()
    );
    if (index !== -1) {
      topOptions[index] = opt;
    } else {
      otherOptions.push(opt);
    }
  });

  const cleanTop = topOptions.filter(Boolean);
  otherOptions.sort((a, b) => a.label.localeCompare(b.label));

  return [...cleanTop, ...otherOptions];
};

export function BankAccountsList({
  bankAccounts,
  size = 'md',
  readOnly = false,
  selectedBankName,
  selectedBankAccount,
  onSelect,
  form,
  sortedOptions,
  onRemove,
  onSetDefault
}: BankAccountsListProps) {
  const cardWrapperClass = {
    sm: 'p-3 bg-gray-50 border border-gray-200/60 rounded-sm space-y-3',
    md: 'p-4 bg-gray-50 border border-gray-200/60 rounded-sm space-y-4',
    lg: 'p-6 bg-gray-50 border border-gray-200/60 rounded-sm space-y-6'
  }[size];

  const innerCardClass = {
    sm: 'p-3 rounded-sm relative overflow-hidden transition-all duration-300 shadow-sm',
    md: 'p-5 rounded-md relative overflow-hidden transition-all duration-300 shadow-md',
    lg: 'p-6 rounded-lg relative overflow-hidden transition-all duration-300 shadow-lg'
  }[size];

  const cardHeaderClass = {
    sm: 'flex justify-between items-center mb-4',
    md: 'flex justify-between items-center mb-6',
    lg: 'flex justify-between items-center mb-8'
  }[size];

  const inputOverlayClass = {
    sm: 'bg-white p-3 rounded-sm shadow-sm text-gray-800 space-y-3',
    md: 'bg-white p-4 rounded-sm shadow-md text-gray-800 space-y-4',
    lg: 'bg-white p-5 rounded-sm shadow-lg text-gray-800 space-y-6'
  }[size];

  return (
    <>
      {bankAccounts.map((account, index) => {
        const bankNameVal = readOnly
          ? account.bankName
          : form?.watch(`bankAccounts.${index}.bankName`) || '';
        const accNumberVal = readOnly
          ? account.accountNumber
          : form?.watch(`bankAccounts.${index}.accountNumber`) || '';
        const accHolderVal = readOnly
          ? account.accountHolder
          : form?.watch(`bankAccounts.${index}.accountHolder`) || '';
        const isDefaultVal = readOnly
          ? account.isDefault
          : form?.watch(`bankAccounts.${index}.isDefault`) || false;

        const cardStyle = getBankCardStyle(bankNameVal);
        const isSelected =
          readOnly &&
          selectedBankName === bankNameVal &&
          selectedBankAccount === accNumberVal;

        return (
          <div key={index} className={readOnly ? '' : cardWrapperClass}>
            {!readOnly && (
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    Nama Bank *
                  </label>
                  {isDefaultVal && (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-extrabold px-2 py-0.5 rounded-sm">
                      Utama
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!isDefaultVal && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onSetDefault?.(index)}
                      className="h-8 px-2 text-xs text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 rounded-sm font-bold"
                    >
                      Set Utama
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove?.(index)}
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-sm"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </Button>
                </div>
              </div>
            )}

            {!readOnly && sortedOptions && (
              <div className="mb-4">
                <ReusableSelect
                  value={bankNameVal}
                  onChange={(v) =>
                    form?.setValue(
                      `bankAccounts.${index}.bankName`,
                      String(v),
                      {
                        shouldValidate: true,
                        shouldDirty: true
                      }
                    )
                  }
                  options={sortedOptions}
                  placeholder="Pilih Bank"
                  showDefaultSelect={true}
                  searchable={true}
                />
                {form?.formState?.errors?.bankAccounts?.[index]?.bankName && (
                  <p className="text-[10px] text-red-500 font-bold uppercase italic mt-1">
                    {form.formState.errors.bankAccounts[index].bankName.message}
                  </p>
                )}
              </div>
            )}

            {/* Premium Credit Card Layout */}
            <div
              className={`
                ${innerCardClass}
                ${cardStyle.bgClass}
                ${cardStyle.textColor}
                ${
                  readOnly
                    ? 'cursor-pointer border-2 transition-all hover:scale-[1.02] active:scale-[0.98]'
                    : ''
                }
                ${
                  readOnly && isSelected
                    ? 'border-blue-500 shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/50 scale-[1.02]'
                    : 'border-transparent opacity-80 hover:opacity-100'
                }
              `}
              onClick={() => {
                if (readOnly && onSelect) {
                  onSelect(bankNameVal, accNumberVal);
                }
              }}
            >
              {/* Decorative Wave Pattern */}
              <div className="absolute inset-0 opacity-15 pointer-events-none">
                <svg
                  className="w-full h-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0,50 C30,40 70,60 100,50 L100,100 L0,100 Z"
                    fill="currentColor"
                  />
                  <path
                    d="M0,60 C40,50 60,70 100,60 L100,100 L0,100 Z"
                    fill="currentColor"
                    opacity="0.5"
                  />
                </svg>
              </div>

              {/* Card Header (Chip & Logo) */}
              <div className={cardHeaderClass}>
                <CardChip />
                <div className="flex items-center gap-2">
                  {isDefaultVal && (
                    <span className="bg-emerald-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm tracking-wider uppercase shadow-sm">
                      Utama
                    </span>
                  )}
                  {cardStyle.logo}
                  {readOnly && isSelected && (
                    <div className="bg-blue-600 text-white rounded-full p-1 shadow-md">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Input Overlay Container */}
              {!readOnly && (
                <div className={inputOverlayClass}>
                  <FormInput
                    form={form}
                    name={`bankAccounts.${index}.accountNumber`}
                    label="Nomor Rekening"
                    placeholder="1234567890"
                    containerClassName="mb-0"
                    className="bg-gray-50 border-gray-200 text-gray-800 text-sm font-semibold tracking-wider"
                    onChange={(e) => {
                      e.target.value = e.target.value.replace(/\D/g, '');
                    }}
                  />

                  <FormInput
                    form={form}
                    name={`bankAccounts.${index}.accountHolder`}
                    label="Nama Pemilik Rekening"
                    placeholder="PT GLOBAL INNOVATIONS JAYA"
                    containerClassName="mb-0"
                    className="bg-gray-50 border-gray-200 text-gray-800 text-sm font-semibold uppercase"
                  />
                </div>
              )}

              {/* Credit Card Detail Footer */}
              <div className="mt-4 pt-3 border-t border-white/20 text-white/90 text-xs space-y-1.5">
                <p className="block text-xs font-bold text-white/60 mb-2">
                  {readOnly ? 'Detail Rekening' : 'Payment Preview'}
                </p>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-white/60">Bank</span>
                  <span className="col-span-2 font-bold truncate">
                    {bankNameVal || '-'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-white/60">No. Rekening</span>
                  <span className="col-span-2 font-mono font-bold">
                    {accNumberVal || '-'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-white/60">Nama Penerima</span>
                  <span className="col-span-2 font-bold uppercase truncate">
                    {accHolderVal || '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

interface BankAccountsEditProps {
  form: any;
  bankOptions: { label: string; value: string }[];
  size?: 'sm' | 'md' | 'lg';
}

function BankAccountsEdit({
  form,
  bankOptions,
  size = 'md'
}: BankAccountsEditProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'bankAccounts'
  });

  const sortedOptions = useMemo(() => {
    return getSortedBankOptions(bankOptions);
  }, [bankOptions]);

  const watchAccountsRaw = form.watch('bankAccounts');
  const watchAccounts = useMemo(() => {
    return watchAccountsRaw || [];
  }, [watchAccountsRaw]);

  useEffect(() => {
    if (watchAccounts.length === 1 && !watchAccounts[0].isDefault) {
      form.setValue('bankAccounts.0.isDefault', true, {
        shouldValidate: true,
        shouldDirty: true
      });
    } else if (watchAccounts.length > 1) {
      const defaults = watchAccounts.filter((acc: any) => acc.isDefault);
      if (defaults.length === 0) {
        form.setValue('bankAccounts.0.isDefault', true, {
          shouldValidate: true,
          shouldDirty: true
        });
      } else if (defaults.length > 1) {
        let foundFirst = false;
        watchAccounts.forEach((acc: any, idx: number) => {
          if (acc.isDefault) {
            if (!foundFirst) {
              foundFirst = true;
            } else {
              form.setValue(`bankAccounts.${idx}.isDefault`, false, {
                shouldValidate: true,
                shouldDirty: true
              });
            }
          }
        });
      }
    }
  }, [watchAccounts, form]);

  const handleSetDefault = (indexToSet: number) => {
    watchAccounts.forEach((_: any, idx: number) => {
      form.setValue(`bankAccounts.${idx}.isDefault`, idx === indexToSet, {
        shouldValidate: true,
        shouldDirty: true
      });
    });
  };

  const spacingClass = {
    sm: 'space-y-4 mt-4',
    md: 'space-y-6 mt-4',
    lg: 'space-y-8 mt-4'
  }[size];

  const titleClass = {
    sm: 'text-xs font-bold text-gray-700 tracking-wider mb-2',
    md: 'text-sm font-medium text-gray-700 mb-1',
    lg: 'text-base font-semibold text-gray-800 mb-2'
  }[size];

  const buttonClass = {
    sm: 'w-full h-9 border-dashed border-blue-200 text-blue-600 hover:bg-blue-50 font-bold text-xs rounded-sm',
    md: 'w-full h-11 border-dashed border-blue-200 text-blue-600 hover:bg-blue-50 font-bold text-sm rounded-sm',
    lg: 'w-full h-12 border-dashed border-blue-200 text-blue-600 hover:bg-blue-50 font-bold text-base rounded-sm'
  }[size];

  return (
    <div className="border-t border-gray-100 pt-4">
      <h3 className={titleClass}>Rekening Bank</h3>
      <div className={spacingClass}>
        <BankAccountsList
          bankAccounts={fields as any}
          size={size}
          readOnly={false}
          form={form}
          sortedOptions={sortedOptions}
          onRemove={remove}
          onSetDefault={handleSetDefault}
        />

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            append({
              bankName: '',
              accountNumber: '',
              accountHolder: '',
              isDefault: false
            })
          }
          className={buttonClass}
        >
          + Tambah Rekening Bank
        </Button>
      </div>
    </div>
  );
}

export function BankAccounts({
  form,
  bankOptions = [],
  size = 'md',
  readOnly = false,
  value,
  selectedBankName,
  selectedBankAccount,
  onSelect
}: BankAccountsProps) {
  if (readOnly) {
    const list = value || [];
    const spacingClass = {
      sm: 'mt-2',
      md: 'mt-3',
      lg: 'mt-4'
    }[size];

    const titleClass = {
      sm: 'text-xs font-bold text-gray-700 tracking-wider mb-2',
      md: 'text-sm font-medium text-gray-700 mb-1',
      lg: 'text-base font-semibold text-gray-800 mb-2'
    }[size];

    return (
      <div className="border-t border-gray-100 pt-4">
        <h3 className={titleClass}>Pilih Rekening Bank Tujuan</h3>
        {list.length === 0 ? (
          <p className="text-xs text-gray-500 italic mt-2">
            Vendor belum memiliki data rekening bank.
          </p>
        ) : (
          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-1 ${spacingClass}`}
          >
            <BankAccountsList
              bankAccounts={list}
              size={size}
              readOnly={true}
              selectedBankName={selectedBankName}
              selectedBankAccount={selectedBankAccount}
              onSelect={onSelect}
            />
          </div>
        )}
      </div>
    );
  }

  return <BankAccountsEdit form={form} bankOptions={bankOptions} size={size} />;
}
