// Rekening Bank Resmi Tujuan Pembayaran & Operasional VARENA
// Saat ini menggunakan rekening operasional terverifikasi an. Sunariyo

export interface CompanyBankAccount {
  bankName: string;
  bankFullName: string;
  accountNumber: string;
  accountNumberClean: string;
  accountHolder: string;
  statusNote?: string;
  isPrimary: boolean;
}

export const COMPANY_BANK_ACCOUNTS: CompanyBankAccount[] = [
  {
    bankName: 'BRI',
    bankFullName: 'Bank Rakyat Indonesia',
    accountNumber: '3065 0102 4471 539',
    accountNumberClean: '306501024471539',
    accountHolder: 'Sunariyo',
    statusNote: 'Rekening Operasional Resmi',
    isPrimary: true,
  },
];

export const PRIMARY_COMPANY_BANK = COMPANY_BANK_ACCOUNTS[0];
