'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingBag,
  CheckCircle,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  Sparkles,
  Copy,
  Check,
  Plus,
  Minus,
  AlertCircle,
  PackageCheck,
  Package,
  Phone,
  Mail,
  Truck,
  MapPin,
  ExternalLink,
  RotateCcw,
  Clock,
  Upload,
  X,
  CheckCircle2,
} from 'lucide-react';
import { PRIMARY_COMPANY_BANK } from '@/config/bank';
import { formatOrderStatus } from '@/lib/formatters';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import { compressImageToWebP } from '@/lib/image-compression';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const [variants, setVariants] = useState<any[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isExistingMember, setIsExistingMember] = useState(false);

  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralInfo, setReferralInfo] = useState<any>(null);
  const [isStockist, setIsStockist] = useState(false);

  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [shippingProvince, setShippingProvince] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingDistrict, setShippingDistrict] = useState('');
  const [shippingPostalCode, setShippingPostalCode] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [shippingNotes, setShippingNotes] = useState('');
  const [uniqueCode, setUniqueCode] = useState(0);

  // Alamat tersimpan dari profil & mode pengiriman
  interface SavedAddress {
    recipientName: string;
    recipientPhone: string;
    province: string;
    city: string;
    district: string;
    postalCode: string;
    addressDetail: string;
  }
  const [savedAddress, setSavedAddress] = useState<SavedAddress | null>(null);
  const [addressMode, setAddressMode] = useState<'SAVED' | 'MANUAL'>('MANUAL');
  const [saveToProfile, setSaveToProfile] = useState(true);

  // Fungsi untuk memuat alamat profil terkini dari database
  const loadProfileAddress = async (mCode?: string, uId?: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('varena_token') : null;
      const params = new URLSearchParams();
      if (mCode && String(mCode).trim()) params.set('memberCode', String(mCode).trim());
      if (uId && String(uId).trim()) params.set('userId', String(uId).trim());
      const qs = params.toString();

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/member/profile${qs ? '?' + qs : ''}`, {
        headers,
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = await res.json();
      const m = data.member || data;

      if (m && (m.addressDetail || m.province || m.city)) {
        const addr: SavedAddress = {
          recipientName: m.recipientName || m.displayName || m.legalName || '',
          recipientPhone: m.recipientPhone || m.phone || m.user?.phone || '',
          province: m.province || '',
          city: m.city || '',
          district: m.district || '',
          postalCode: m.postalCode || '',
          addressDetail: m.addressDetail || '',
        };
        setSavedAddress(addr);

        // Hanya gunakan mode SAVED jika alamat memiliki kelengkapan jalan dan kota/provinsi
        if (addr.addressDetail && (addr.city || addr.province)) {
          setAddressMode('SAVED');
        } else {
          setAddressMode('MANUAL');
        }

        // Pre-fill form state juga agar siap digunakan jika beralih ke manual
        if (addr.recipientName) setRecipientName(addr.recipientName);
        if (addr.recipientPhone) setRecipientPhone(addr.recipientPhone);
        if (addr.province) setShippingProvince(addr.province);
        if (addr.city) setShippingCity(addr.city);
        if (addr.district) setShippingDistrict(addr.district);
        if (addr.postalCode) setShippingPostalCode(addr.postalCode);
        if (addr.addressDetail) setAddressDetail(addr.addressDetail);

        // Update stored user di localStorage agar sinkron
        try {
          const raw = localStorage.getItem('varena_user');
          if (raw) {
            const u = JSON.parse(raw);
            localStorage.setItem('varena_user', JSON.stringify({ ...u, ...addr }));
          }
        } catch {}
      } else {
        setSavedAddress(null);
        setAddressMode('MANUAL');
      }

      // Load rekening tersimpan mitra jika ada
      if (m && m.bankName && m.bankAccountNumber) {
        setSavedBank({
          bankName: m.bankName,
          accountNumber: m.bankAccountNumber,
          accountHolder: m.bankAccountHolder || m.displayName || m.legalName || '',
        });
        setConfirmBankName(m.bankName);
        setConfirmAccountNumber(m.bankAccountNumber);
        setConfirmAccountHolder(m.bankAccountHolder || m.displayName || m.legalName || '');
      }

      // Tandai sebagai member jika ada memberCode
      if (m && m.memberCode) {
        setIsExistingMember(true);
      }

      // Load upline sponsor jika member sudah login
      if (m && m.sponsor && m.sponsor.code) {
        setReferralCode(m.sponsor.code);
        setReferralInfo({
          name: m.sponsor.name,
          code: m.sponsor.code,
          isUpline: true,
        });
        try {
          const raw = localStorage.getItem('varena_user');
          if (raw) {
            const u = JSON.parse(raw);
            localStorage.setItem(
              'varena_user',
              JSON.stringify({
                ...u,
                sponsorCode: m.sponsor.code,
                sponsorName: m.sponsor.name,
              })
            );
          }
        } catch {}
      }
    } catch (err) {
      console.warn('Could not load profile address:', err);
    }
  };

  // State Rekening & Countdown 24 Jam
  interface SavedBank {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  }
  const [savedBank, setSavedBank] = useState<SavedBank | null>(null);
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
    expired: boolean;
  } | null>(null);

  // Modal Konfirmasi Pembayaran Pesanan
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmBankMode, setConfirmBankMode] = useState<'SAVED' | 'MANUAL'>('SAVED');
  const [confirmBankName, setConfirmBankName] = useState('BCA');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [confirmAccountHolder, setConfirmAccountHolder] = useState('');
  const [confirmTransferAmount, setConfirmTransferAmount] = useState('');
  const [confirmNotes, setConfirmNotes] = useState('');
  const [confirmProofFile, setConfirmProofFile] = useState<File | null>(null);
  const [confirmProofUrl, setConfirmProofUrl] = useState('');
  const [confirmProofPreview, setConfirmProofPreview] = useState('');
  const [compressingProof, setCompressingProof] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState('');
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [confirmSuccessMsg, setConfirmSuccessMsg] = useState('');

  const [loading, setLoading] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);
  const [settleResult, setSettleResult] = useState<any>(null);
  const [settling, setSettling] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  // Metode pembayaran & saldo deposit
  const [paymentMethod, setPaymentMethod] = useState<'TRANSFER' | 'DEPOSIT'>('TRANSFER');
  const [shoppingDepositBalance, setShoppingDepositBalance] = useState(0);

  // Countdown timer 1 jam untuk pembayaran pesanan
  useEffect(() => {
    if (!orderResult || orderResult.orderStatus !== 'PENDING_PAYMENT') {
      setTimeLeft(null);
      return;
    }

    const createdTime = new Date(orderResult.createdAt || Date.now()).getTime();
    const expiryTime = createdTime + 1 * 60 * 60 * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiryTime - now) / 1000));
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, expired: true });
        // Batalkan pesanan otomatis jika belum kirim konfirmasi bayar
        if (orderResult.paymentConfirmationStatus !== 'SUBMITTED') {
          fetch('/api/v1/orders/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderNumber: orderResult.orderNumber }),
          })
            .then(() => {
              setOrderResult((prev: any) =>
                prev ? { ...prev, orderStatus: 'CANCELLED' } : null
              );
            })
            .catch(() => {});
        }
      } else {
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        setTimeLeft({ hours, minutes, seconds, totalSeconds: diff, expired: false });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [
    orderResult?.orderNumber,
    orderResult?.createdAt,
    orderResult?.orderStatus,
    orderResult?.paymentConfirmationStatus,
  ]);

  // Handler kirim konfirmasi pembayaran oleh mitra
  const handleConfirmOrderPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderResult) return;
    setConfirmSubmitting(true);
    setConfirmSuccessMsg('');

    try {
      const activeBank =
        confirmBankMode === 'SAVED' && savedBank ? savedBank.bankName : confirmBankName;
      const activeAcc =
        confirmBankMode === 'SAVED' && savedBank ? savedBank.accountNumber : confirmAccountNumber;
      const activeHolder =
        confirmBankMode === 'SAVED' && savedBank ? savedBank.accountHolder : confirmAccountHolder;

      if (!activeBank || !activeAcc || !activeHolder) {
        throw new Error('Mohon lengkapi data rekening pengirim.');
      }

      // Upload file bukti transfer jika ada (sudah terkompresi WebP)
      let uploadedProofUrl = confirmProofUrl;
      if (confirmProofFile && !uploadedProofUrl) {
        const fd = new FormData();
        fd.append('file', confirmProofFile);
        fd.append('category', 'proof');
        try {
          const upRes = await fetch('/api/v1/upload', { method: 'POST', body: fd });
          const upData = await upRes.json();
          if (upData.url) uploadedProofUrl = upData.url;
        } catch (e) {
          console.warn('Upload error:', e);
        }
      }

      const res = await fetch('/api/v1/orders/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: orderResult.orderNumber,
          senderBankName: activeBank,
          senderAccountName: activeHolder,
          transferAmountPaid: parseInt(confirmTransferAmount) || orderResult.total,
          transferNotes: confirmNotes
            ? `${activeAcc ? `No Rek: ${activeAcc}. ` : ''}${confirmNotes}`
            : `Transfer dari ${activeBank} ${activeAcc}`,
          paymentProofUrl: uploadedProofUrl || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengirimkan konfirmasi pembayaran.');

      setConfirmSuccessMsg(data.message || 'Konfirmasi pembayaran berhasil dikirim!');
      setOrderResult((prev: any) => ({
        ...prev,
        paymentConfirmationStatus: 'SUBMITTED',
      }));
      setTimeout(() => {
        setShowConfirmModal(false);
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Gagal mengirim konfirmasi.');
    } finally {
      setConfirmSubmitting(false);
    }
  };

  const copyAccountNumber = (accountNum: string) => {
    navigator.clipboard?.writeText(accountNum.replace(/\s+/g, ''));
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const copyAmount = (amount: number) => {
    navigator.clipboard?.writeText(String(amount));
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  useEffect(() => {
    // 1. Fetch available product variants
    fetch('/api/v1/catalog/products')
      .then((res) => res.json())
      .then((data) => {
        if (data.products && data.products.length > 0) {
          const allVariants: any[] = [];
          data.products.forEach((p: any) => {
            p.variants.forEach((v: any) =>
              allVariants.push({
                ...v,
                productName: p.name,
                category: p.category,
              })
            );
          });
          setVariants(allVariants);

          const preselect = searchParams?.get('variantId');
          if (preselect && allVariants.some((v) => v.id === preselect)) {
            setQuantities({ [preselect]: 1 });
          } else {
            // Find default primary first pack (allowFirstPack or price >= 500.000 or 10 sachet box)
            const defaultPack =
              allVariants.find(
                (v) => v.allowFirstPack || v.price >= 500000 || v.packSize >= 10
              ) || allVariants[0];
            if (defaultPack) {
              setQuantities({ [defaultPack.id]: 1 });
            }
          }
        }
      });

    // 2. Prepopulate buyer info if logged in
    const storedUser = localStorage.getItem('varena_user');
    let loggedInMemberCode = '';
    let parsedUserObj: any = null;
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        parsedUserObj = u;
        loggedInMemberCode = (u.memberCode || '').toUpperCase();
        if (u.memberCode || u.isActiveMember || u.role === 'MEMBER' || u.role === 'STOCKIST') {
          setIsExistingMember(true);
        }
        if (u.sponsorCode) {
          setReferralCode(u.sponsorCode);
          setReferralInfo({
            code: u.sponsorCode,
            name: u.sponsorName || 'Upline Sponsor',
            isUpline: true,
          });
        }
        if (u.displayName) setBuyerName((prev) => prev || u.displayName);
        if (u.email) setBuyerEmail((prev) => prev || u.email);
        if (u.phone) setBuyerPhone((prev) => prev || u.phone);
        if (u.stockistType === 'MASTER' || u.stockistType === 'MOBILE') {
          setIsStockist(true);
        }
        if (u.recipientName) setRecipientName(u.recipientName);
        if (u.recipientPhone) setRecipientPhone(u.recipientPhone);
        if (u.province) setShippingProvince(u.province);
        if (u.city) setShippingCity(u.city);
        if (u.district) setShippingDistrict(u.district);
        if (u.postalCode) setShippingPostalCode(u.postalCode);
        if (u.addressDetail) setAddressDetail(u.addressDetail);

        if (u.addressDetail && u.province && u.city) {
          setSavedAddress({
            recipientName: u.recipientName || u.displayName || '',
            recipientPhone: u.recipientPhone || u.phone || '',
            province: u.province,
            city: u.city,
            district: u.district || '',
            postalCode: u.postalCode || '',
            addressDetail: u.addressDetail,
          });
          setAddressMode('SAVED');
        }

        // Fetch fresh address & sponsor dari database
        loadProfileAddress(u.memberCode, u.userId || u.id);

        // Fetch saldo deposit belanja member
        const dToken = localStorage.getItem('varena_token');
        const dHeaders: Record<string, string> = {};
        if (dToken) dHeaders['Authorization'] = `Bearer ${dToken}`;
        fetch('/api/v1/agent/deposit', { headers: dHeaders })
          .then((r) => r.json())
          .then((d) => {
            const bal = d.shoppingDepositBalance ?? (d.isAgent ? 0 : d.balance) ?? 0;
            setShoppingDepositBalance(Number(bal) || 0);
          })
          .catch(() => {});
      } catch (e) {}
    } else {
      // Jika token ada di session, coba load profil
      const storedToken = localStorage.getItem('varena_token');
      if (storedToken) {
        loadProfileAddress();
      }
    }

    // 3. Prepopulate referral code if stored or param
    const paramRef = searchParams?.get('ref');
    const storedRef = localStorage.getItem('varena_referral_code');
    let initialRef = '';

    if (loggedInMemberCode) {
      // Member sudah login: otomatis gunakan upline sponsor resminya jika ada
      if (parsedUserObj?.sponsorCode) {
        initialRef = String(parsedUserObj.sponsorCode).toUpperCase();
        setReferralCode(initialRef);
        setReferralInfo({
          code: initialRef,
          name: parsedUserObj.sponsorName || 'Upline Sponsor',
          isUpline: true,
        });
      }
      // loadProfileAddress di atas akan otomatis melengkapi jika sponsorCode belum tercache
    } else {
      // Belum login (calon mitra baru atau konsumen umum non-login): gunakan link ref, cookie ref, atau default pusat
      initialRef = (paramRef || storedRef || 'VRN-LDR-03').toUpperCase();
      if (initialRef) {
        setReferralCode(initialRef);
        validateReferral(initialRef);
      }
    }

    // 4. Load existing order details if orderNumber query param is present
    const paramOrderNumber = searchParams?.get('orderNumber');
    if (paramOrderNumber) {
      fetch(`/api/v1/orders/detail?orderNumber=${encodeURIComponent(paramOrderNumber)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.order) {
            setOrderResult(data.order);
            setUniqueCode(data.order.uniqueCode || 0);
          }
        })
        .catch((err) => console.error('Failed to load existing order:', err));
    }
  }, [searchParams]);

  const validateReferral = async (code: string) => {
    if (!code) {
      setReferralInfo(null);
      return;
    }
    try {
      const res = await fetch(`/api/v1/catalog/referral-check?code=${code.trim()}`);
      const data = await res.json();
      if (data.valid) {
        setReferralInfo(data.sponsor);
      } else {
        setReferralInfo(null);
      }
    } catch (e) {
      setReferralInfo(null);
    }
  };

  const isFirstPackVariant = (v: any) =>
    Boolean(v.allowFirstPack || v.packSize >= 10 || (v.price >= 500000 && v.variantType === 'PACK'));

  const getQty = (variantId: string) => quantities[variantId] || 0;
  const setQty = (variantId: string, val: number) => {
    const clean = Math.max(0, Math.floor(val || 0));
    setQuantities((prev) => {
      const next = { ...prev };
      if (clean <= 0) {
        delete next[variantId];
      } else {
        next[variantId] = clean;
      }
      return next;
    });
  };

  const selectedItems = variants
    .filter((v) => (quantities[v.id] || 0) > 0)
    .map((v) => ({
      variant: v,
      quantity: quantities[v.id],
      lineTotal: v.price * quantities[v.id],
      isFirstPack: isFirstPackVariant(v),
    }));

  const totalItemsCount = selectedItems.reduce((acc, it) => acc + it.quantity, 0);
  const subtotal = selectedItems.reduce((acc, it) => acc + it.lineTotal, 0);
  const shippingCost = isStockist ? 0 : subtotal > 0 ? 20000 : 0;
  const total = subtotal + shippingCost; // uniqueCode added server-side

  const hasFirstPackSelected = variants.some(
    (v) => isFirstPackVariant(v) && (quantities[v.id] || 0) >= 1
  );

  const isNewRegistrationFlow = !isExistingMember;
  const canSubmitOrder =
    totalItemsCount > 0 && (!isNewRegistrationFlow || hasFirstPackSelected);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedItems.length === 0) {
      alert('Silakan pilih minimal 1 produk.');
      return;
    }

    if (isNewRegistrationFlow && !hasFirstPackSelected) {
      alert(
        'Untuk aktivasi kemitraan belanja pertama, wajib memilih minimal 1 Box Kopi Premium (senilai Rp500.000).'
      );
      return;
    }

    setLoading(true);
    setOrderResult(null);
    setSettleResult(null);

    try {
      const storedUser = localStorage.getItem('varena_user');
      let buyerUserId: string | undefined = undefined;
      if (storedUser) {
        try {
          const u = JSON.parse(storedUser);
          buyerUserId = u.userId || u.id;
        } catch (e) {}
      }

      const items = selectedItems.map((it) => ({
        variantId: it.variant.id,
        quantity: it.quantity,
      }));

      // Tentukan alamat yang digunakan: apakah dari Card Alamat Tersimpan atau Form Manual
      const activeRecipientName =
        (addressMode === 'SAVED' && savedAddress?.recipientName ? savedAddress.recipientName : '') ||
        recipientName.trim() ||
        buyerName.trim();
      const activeRecipientPhone =
        (addressMode === 'SAVED' && savedAddress?.recipientPhone ? savedAddress.recipientPhone : '') ||
        recipientPhone.trim() ||
        buyerPhone.trim();
      const activeProvince =
        (addressMode === 'SAVED' && savedAddress?.province ? savedAddress.province : '') ||
        shippingProvince.trim();
      const activeCity =
        (addressMode === 'SAVED' && savedAddress?.city ? savedAddress.city : '') ||
        shippingCity.trim();
      const activeDistrict =
        (addressMode === 'SAVED' && savedAddress?.district ? savedAddress.district : '') ||
        shippingDistrict.trim();
      const activePostalCode =
        (addressMode === 'SAVED' && savedAddress?.postalCode ? savedAddress.postalCode : '') ||
        shippingPostalCode.trim();
      const activeAddressDetail =
        (addressMode === 'SAVED' && savedAddress?.addressDetail ? savedAddress.addressDetail : '') ||
        addressDetail.trim();

      if (!activeRecipientName || !activeRecipientPhone) {
        alert('Silakan lengkapi nama dan nomor WhatsApp penerima.');
        setLoading(false);
        return;
      }

      if (!activeAddressDetail || !activeProvince || !activeCity) {
        alert('Silakan lengkapi rincian alamat pengiriman (Provinsi, Kota, dan Detail Jalan).');
        setLoading(false);
        return;
      }

      const formattedShippingAddress = [
        activeAddressDetail,
        activeDistrict ? `Kec. ${activeDistrict}` : null,
        activeCity,
        activeProvince,
        activePostalCode ? `Kode Pos ${activePostalCode}` : null,
      ]
        .filter(Boolean)
        .join(', ');

      const token = typeof window !== 'undefined' ? localStorage.getItem('varena_token') : null;
      const checkoutHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) checkoutHeaders['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/orders/checkout', {
        method: 'POST',
        headers: checkoutHeaders,
        body: JSON.stringify({
          buyerUserId,
          buyerName: activeRecipientName,
          buyerPhone: activeRecipientPhone,
          buyerEmail,
          shippingAddress: formattedShippingAddress,
          referralCode: referralCode ? referralCode.trim() : undefined,
          items,
          shippingCost,
          isStockistOrder: isStockist,
          recipientName: activeRecipientName,
          recipientPhone: activeRecipientPhone,
          shippingProvince: activeProvince,
          shippingCity: activeCity,
          shippingDistrict: activeDistrict || undefined,
          shippingPostalCode: activePostalCode || undefined,
          addressDetail: activeAddressDetail,
          shippingNotes,
          saveToProfile: addressMode === 'MANUAL' ? saveToProfile : false,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses pesanan.');
      }
      setOrderResult(data.order);
      if (data.order.uniqueCode) setUniqueCode(data.order.uniqueCode);
      // Jika bayar via deposit, kurangi tampilan saldo lokal
      if (data.order.paidViaDeposit) {
        setShoppingDepositBalance((prev) => Math.max(0, prev - (data.order.total || 0)));
      }

      // Jika mengisi alamat manual dan opsi simpan aktif, perbarui state & localStorage
      if (addressMode === 'MANUAL' && saveToProfile) {
        const newAddr = {
          recipientName: activeRecipientName,
          recipientPhone: activeRecipientPhone,
          province: activeProvince,
          city: activeCity,
          district: activeDistrict,
          postalCode: activePostalCode,
          addressDetail: activeAddressDetail,
        };
        setSavedAddress(newAddr);
        try {
          const raw = localStorage.getItem('varena_user');
          if (raw) {
            const u = JSON.parse(raw);
            localStorage.setItem('varena_user', JSON.stringify({ ...u, ...newAddr }));
          }
        } catch {}
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!orderResult?.id) return;
    setSettling(true);

    try {
      const res = await fetch('/api/v1/orders/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderResult.id,
          providerRef: `SIM-BANK-REF-${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyelesaikan pembayaran.');
      }
      setSettleResult(data.result);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSettling(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-varena-gold">VARENA Market</span>
        <h1 className="font-serif text-3xl font-bold text-varena-espresso mt-1">Pemesanan & Checkout Multi-Produk</h1>
        <p className="text-xs sm:text-sm text-varena-taupe-dark mt-1">
          Pemesanan resmi mitra dan konsumen dengan perlindungan konsumen serta jaminan keaslian 100%.
        </p>
      </div>

      {!orderResult ? (
        <form onSubmit={handleCreateOrder} className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Order Details Column */}
          <div className="md:col-span-7 space-y-6">
            {/* Quick Login / Account Link & Soft Partner Invitation */}
            {!buyerEmail ? (
              <div className="p-4 rounded-xl bg-white border border-stone-200/90 shadow-2xs space-y-3">
                {/* Header & Quick Action Buttons */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <span>Sudah punya akun? Masuk untuk lacak pesanan lebih mudah</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Riwayat transaksi dan nomor resi kurir otomatis tersimpan di dashboard akun Anda.
                    </p>
                  </div>

                  {/* Action buttons: Google & Email */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
                    <GoogleSignInButton
                      label="Masuk Google"
                      sponsorCode={referralCode}
                      onSuccess={(data) => {
                        const d = data as {
                          user?: {
                            displayName?: string;
                            email?: string;
                            phone?: string;
                            memberCode?: string;
                            sponsorCode?: string;
                            sponsorName?: string;
                          };
                        };
                        if (d.user?.displayName) {
                          setBuyerName(d.user.displayName);
                          setRecipientName((prev) => prev || d.user!.displayName!);
                        }
                        if (d.user?.email) setBuyerEmail(d.user.email);
                        if (d.user?.phone) {
                          setBuyerPhone(d.user.phone);
                          setRecipientPhone((prev) => prev || d.user!.phone!);
                        }
                        if (d.user?.memberCode) setIsExistingMember(true);
                        if (d.user?.sponsorCode) {
                          setReferralCode(d.user.sponsorCode);
                          setReferralInfo({
                            code: d.user.sponsorCode,
                            name: d.user.sponsorName || 'Upline Sponsor',
                            isUpline: true,
                          });
                        }
                        const uid = (d.user as any)?.id || (d.user as any)?.userId;
                        if (d.user?.memberCode || uid) {
                          loadProfileAddress(d.user?.memberCode, uid);
                        }
                      }}
                      className="py-1.5 px-3 text-xs"
                    />
                    <Link
                      href="/login?redirect=/checkout"
                      className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-stone-300 hover:border-varena-gold bg-stone-50 hover:bg-white text-stone-700 text-xs font-semibold transition"
                    >
                      Masuk Email
                    </Link>
                  </div>
                </div>

                {/* Soft Partner Invitation Footer */}
                <div className="pt-2.5 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-stone-600 bg-stone-50/70 -mx-4 -mb-4 px-4 py-2.5 rounded-b-xl">
                  <div className="flex items-center gap-1.5">
                    <span className="text-varena-gold font-bold">★</span>
                    <span>Ingin harga lebih hemat & potensi bonus komisi belanja?</span>
                  </div>
                  <Link
                    href={`/register?ref=${referralCode || 'VRN-LDR-03'}`}
                    className="font-semibold text-varena-gold hover:text-varena-gold-hover hover:underline inline-flex items-center gap-1 whitespace-nowrap self-start sm:self-auto"
                  >
                    <span>Daftar Jadi Mitra VARENA</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-white border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    ✓
                  </div>
                  <div>
                    <div className="font-semibold text-stone-800 flex items-center gap-1.5">
                      <span>{buyerName || 'Mitra'}</span>
                      {isExistingMember && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 font-mono">
                          Mitra Resmi
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-stone-500 font-mono">{buyerEmail}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-stone-500 self-end sm:self-auto">
                  <span className="text-emerald-700 font-medium">● Sesi Terhubung</span>
                </div>
              </div>
            )}

            {/* Activation Policy Banner */}
            {isNewRegistrationFlow ? (
              hasFirstPackSelected ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3 shadow-xs">
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-emerald-800">Syarat Aktivasi Kemitraan Terpenuhi ✓</div>
                    <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                      Anda telah memilih paket wajib Kopi Premium (Rp500.000). Anda dapat menambahkan varian produk lainnya dalam pesanan ini — produk tambahan dihitung sebagai repeat order dengan bonus jaringan otomatis.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-3 shadow-xs">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-amber-800">Ketentuan Belanja Pertama Mitra Baru</div>
                    <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                      Untuk aktivasi hak kemitraan VARENA, wajib memilih minimal <strong>1 Box Kopi Premium (senilai Rp500.000)</strong>. Anda juga bebas memesan varian lainnya sekaligus dalam transaksi ini.
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="p-3.5 rounded-2xl bg-varena-ivory-light border border-varena-taupe/20 text-xs text-varena-taupe-dark flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-emerald-600" />
                  <span>Belanja Ulang (Repeat Order) Mitra Resmi</span>
                </div>
                <span className="font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded text-[11px]">
                  Mitra Aktif
                </span>
              </div>
            )}

            {/* Product Variant Multi-Selector */}
            <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-varena-gold" />
                  <span>Pilih Produk & Atur Jumlah (Multi-Produk)</span>
                </h2>
                <span className="text-xs text-varena-taupe">
                  {totalItemsCount} item dipilih
                </span>
              </div>

              <div className="space-y-3">
                {variants.map((v) => {
                  const qty = getQty(v.id);
                  const isFirst = isFirstPackVariant(v);

                  return (
                    <div
                      key={v.id}
                      className={`p-4 rounded-xl border transition ${
                        qty > 0
                          ? 'border-varena-gold bg-varena-ivory-light/40 shadow-xs'
                          : 'border-varena-taupe/20 bg-white hover:border-varena-gold/40'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Product Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-varena-espresso">{v.name}</span>
                            {isFirst && (
                              <span className="text-[10px] font-bold bg-varena-gold/15 text-varena-espresso border border-varena-gold/40 px-2 py-0.5 rounded-full">
                                Paket Wajib Aktivasi (Rp500.000)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-varena-taupe mt-0.5">
                            {v.productName ? `${v.productName} · ` : ''}Isi {v.packSize} {v.unit}
                            {v.stockQuantity !== undefined && (
                              <span className="ml-2 text-stone-500">· Stok: {v.stockQuantity}</span>
                            )}
                          </div>
                          <div className="font-serif font-bold text-sm text-varena-gold mt-1">
                            Rp{v.price.toLocaleString('id-ID')}
                          </div>
                        </div>

                        {/* Stepper & Line Total */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-varena-taupe/15">
                          {qty > 0 && (
                            <div className="text-right sm:mr-1">
                              <div className="text-[10px] text-varena-taupe">Subtotal:</div>
                              <div className="font-mono text-xs font-bold text-varena-espresso whitespace-nowrap">
                                Rp{(v.price * qty).toLocaleString('id-ID')}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 bg-white border border-varena-taupe/30 rounded-lg p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => setQty(v.id, qty - 1)}
                              disabled={qty <= 0}
                              className="w-7 h-7 rounded flex items-center justify-center text-varena-espresso hover:bg-varena-ivory transition disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              max={v.stockQuantity || 9999}
                              value={qty === 0 ? '' : qty}
                              onChange={(e) => setQty(v.id, parseInt(e.target.value) || 0)}
                              placeholder="0"
                              className="w-12 text-center text-xs font-bold font-mono focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setQty(v.id, qty + 1)}
                              className="w-7 h-7 rounded flex items-center justify-center text-varena-espresso hover:bg-varena-ivory transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Buyer & Shipping Form */}
            <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-serif text-lg font-bold text-varena-espresso flex items-center gap-2">
                  <Truck className="w-5 h-5 text-varena-gold" />
                  <span>Data Penerima & Pengiriman</span>
                </h2>
                {savedAddress && addressMode === 'SAVED' && (
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Alamat Utama Aktif
                  </span>
                )}
              </div>

              {/* KONDISI 1: ALAMAT TERSIMPAN DI PROFIL (DEFAULT MODE JIKA SUDAH ADA) */}
              {savedAddress && addressMode === 'SAVED' ? (
                <div className="space-y-4">
                  {/* Card Alamat Utama */}
                  <div className="relative rounded-2xl border-2 border-varena-gold/60 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/30 p-4 sm:p-5 shadow-xs transition hover:border-varena-gold">
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-varena-espresso uppercase tracking-wider">
                          Alamat Pengiriman Utama (Tersimpan di Profil)
                        </span>
                      </div>
                      <Link
                        href="/member/profile"
                        target="_blank"
                        className="text-[11px] font-semibold text-varena-gold hover:text-varena-espresso hover:underline flex items-center gap-1 transition"
                      >
                        <span>Setting Profil</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    <div className="space-y-1.5 text-xs text-stone-700">
                      <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1">
                        <span className="font-bold text-sm text-varena-espresso">
                          {savedAddress.recipientName}
                        </span>
                        <span className="text-stone-300">•</span>
                        <span className="inline-flex items-center gap-1 font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                          <Phone className="w-3 h-3" />
                          {savedAddress.recipientPhone} (WhatsApp)
                        </span>
                        {buyerEmail && (
                          <>
                            <span className="text-stone-300">•</span>
                            <span className="inline-flex items-center gap-1 text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md text-[11px]">
                              <Mail className="w-3 h-3 text-stone-400" />
                              {buyerEmail}
                            </span>
                          </>
                        )}
                      </div>

                      <p className="font-medium text-stone-800 leading-relaxed pt-1 text-xs sm:text-sm">
                        {savedAddress.addressDetail}
                      </p>

                      <p className="text-stone-500 text-[11px]">
                        {[
                          savedAddress.district && `Kec. ${savedAddress.district}`,
                          savedAddress.city,
                          savedAddress.province,
                          savedAddress.postalCode && `Kode Pos ${savedAddress.postalCode}`,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-varena-gold/20 flex items-center justify-between text-[11px] text-stone-500">
                      <span className="flex items-center gap-1 text-emerald-700 font-medium">
                        <Check className="w-3.5 h-3.5" />
                        Otomatis dipilih untuk pesanan ini
                      </span>
                    </div>
                  </div>

                  {/* Tombol Switch ke Form Alamat Lain */}
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => setAddressMode('MANUAL')}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-varena-gold hover:text-varena-espresso transition py-1 hover:underline"
                    >
                      <MapPin className="w-4 h-4 text-varena-gold" />
                      <span>Kirim ke Alamat Lain / Gunakan Alamat Berbeda →</span>
                    </button>
                  </div>

                  {/* Catatan untuk Kurir */}
                  <div className="pt-2 border-t border-varena-taupe/20">
                    <label className="block font-semibold text-varena-espresso mb-1 text-xs">
                      Catatan untuk Kurir (Opsional)
                    </label>
                    <textarea
                      rows={2}
                      value={shippingNotes}
                      onChange={(e) => setShippingNotes(e.target.value)}
                      placeholder="Patokan rumah, warna pagar, atau instruksi pengantar..."
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                    ></textarea>
                  </div>
                </div>
              ) : (
                /* KONDISI 2: FORM MANUAL LENGKAP */
                <div className="space-y-3.5 text-xs">
                  {/* Banner Info Header */}
                  {savedAddress ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <div className="flex items-center gap-2 text-xs text-amber-900">
                        <MapPin className="w-4 h-4 text-varena-gold flex-shrink-0" />
                        <span className="font-medium">Mengisi alamat pengiriman lain (manual)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAddressMode('SAVED')}
                        className="text-xs font-bold text-varena-espresso hover:text-varena-gold flex items-center gap-1.5 transition underline decoration-dotted"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Gunakan Alamat Utama Saya</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 flex items-start gap-2.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs space-y-0.5 leading-relaxed">
                        <p className="font-bold text-emerald-800">Alamat Belum Tersimpan di Pengaturan</p>
                        <p className="text-emerald-700 text-[11px]">
                          Alamat yang Anda isi di bawah akan <strong>otomatis tersimpan ke Pengaturan Profil Akun Mitra Anda</strong>, sehingga pesanan berikutnya langsung default dan tidak perlu mengisi ulang di menu setting.
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-varena-espresso mb-1">Nama Penerima *</label>
                    <input
                      type="text"
                      required
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder={buyerName || 'Nama penerima paket'}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-varena-espresso mb-1">
                        Nomor WhatsApp Penerima *
                      </label>
                      <div className="relative">
                        <input
                          type="tel"
                          required
                          value={recipientPhone}
                          onChange={(e) => setRecipientPhone(e.target.value)}
                          placeholder={buyerPhone || '081234567890'}
                          className="w-full pl-8 pr-3.5 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold font-mono"
                        />
                        <Phone className="w-3.5 h-3.5 text-emerald-600 absolute left-2.5 top-3" />
                      </div>
                      <p className="text-[10px] text-emerald-700 mt-1">
                        * Pastikan nomor terhubung dengan <strong>WhatsApp aktif</strong> untuk konfirmasi pesanan & resi kurir.
                      </p>
                    </div>
                    <div>
                      <label className="block font-semibold text-varena-espresso mb-1">Alamat Gmail (Opsional)</label>
                      <div className="relative">
                        <input
                          type="email"
                          value={buyerEmail}
                          onChange={(e) => setBuyerEmail(e.target.value)}
                          placeholder="budi@gmail.com"
                          className="w-full pl-8 pr-3.5 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                        />
                        <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-3" />
                      </div>
                      <p className="text-[10px] text-stone-500 mt-1">
                        * Faktur resmi & bukti bayar akan dikirimkan ke email ini.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-varena-taupe/20">
                    <p className="font-bold text-varena-espresso mb-2 text-[11px] uppercase tracking-wide">
                      Alamat Pengiriman Terstruktur
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-varena-espresso mb-1">Provinsi *</label>
                      <input
                        type="text"
                        required
                        value={shippingProvince}
                        onChange={(e) => setShippingProvince(e.target.value)}
                        placeholder="DKI Jakarta"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-varena-espresso mb-1">Kota / Kabupaten *</label>
                      <input
                        type="text"
                        required
                        value={shippingCity}
                        onChange={(e) => setShippingCity(e.target.value)}
                        placeholder="Jakarta Selatan"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-varena-espresso mb-1">Kecamatan (Opsional)</label>
                      <input
                        type="text"
                        value={shippingDistrict}
                        onChange={(e) => setShippingDistrict(e.target.value)}
                        placeholder="Kebayoran Baru"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-varena-espresso mb-1">Kode Pos (Opsional)</label>
                      <input
                        type="text"
                        value={shippingPostalCode}
                        onChange={(e) => setShippingPostalCode(e.target.value)}
                        placeholder="12160"
                        maxLength={5}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-varena-espresso mb-1">Detail Jalan / Alamat *</label>
                    <textarea
                      required
                      rows={2}
                      value={addressDetail}
                      onChange={(e) => setAddressDetail(e.target.value)}
                      placeholder="Jl. Mawar No. 12, RT 01/02, Komplek..."
                      className="w-full px-3.5 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                    ></textarea>
                  </div>

                  {/* Opsi simpan ke profil jika sebelumnya sudah ada alamat tersimpan */}
                  {savedAddress && (
                    <div className="pt-1">
                      <label className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={saveToProfile}
                          onChange={(e) => setSaveToProfile(e.target.checked)}
                          className="w-4 h-4 text-varena-gold rounded border-stone-300 focus:ring-varena-gold"
                        />
                        <span>Jadikan juga alamat baru ini sebagai alamat utama di Pengaturan Profil saya</span>
                      </label>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-varena-espresso mb-1">Catatan untuk Kurir (Opsional)</label>
                    <textarea
                      rows={1}
                      value={shippingNotes}
                      onChange={(e) => setShippingNotes(e.target.value)}
                      placeholder="Patokan / catatan pengantar"
                      className="w-full px-3.5 py-2 rounded-lg border border-varena-taupe/30 focus:outline-none focus:border-varena-gold"
                    ></textarea>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Summary Column */}
          <div className="md:col-span-5 space-y-6">
            {/* Referral Attribution Box */}
            <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-varena-espresso">Kode Referral Mitra (Upline/Sponsor):</span>
                {isExistingMember && referralCode ? (
                  <span className="text-[10px] text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full font-semibold border border-blue-200 flex items-center gap-1">
                    <span>✓</span> Upline Resmi Anda
                  </span>
                ) : referralInfo ? (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">
                    Terverifikasi
                  </span>
                ) : null}
              </div>

              {isExistingMember && referralCode ? (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border border-blue-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
                      Upline Sponsor Jaringan Anda
                    </span>
                    <span className="font-mono text-xs font-bold text-blue-900 bg-white px-2.5 py-0.5 rounded-lg border border-blue-200 shadow-2xs">
                      {referralCode}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-varena-espresso">
                    {referralInfo?.name || 'Sponsor Terverifikasi'}
                  </div>
                  <p className="text-[10px] text-blue-700/90 leading-relaxed">
                    * Otomatis terhubung ke upline sponsor resmi Anda di jaringan VARENA untuk perhitungan bonus sponsor & pembinaan tim.
                  </p>
                </div>
              ) : isExistingMember && !referralCode ? (
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600">
                  <div className="font-bold text-stone-800 mb-0.5">Akun Utama / Tanpa Upline Sponsor</div>
                  <div className="text-[10px] text-stone-500">
                    Transaksi ini tercatat langsung di bawah operasional kantor pusat.
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setReferralCode(val);
                        validateReferral(val);
                      }}
                      placeholder="Kode Sponsor (misal: VRN-0001)"
                      className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-varena-taupe/30 uppercase focus:outline-none focus:border-varena-gold"
                    />
                  </div>

                  {referralInfo ? (
                    <div className="p-2.5 rounded-lg bg-varena-ivory-light border border-varena-gold/30 text-xs">
                      <div className="text-varena-taupe text-[11px]">Sponsor Rujukan:</div>
                      <div className="font-semibold text-varena-espresso">
                        {referralInfo.name} ({referralInfo.code})
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-varena-taupe">
                      * Transaksi tanpa kode sponsor akan otomatis diarahkan ke operasional resmi pusat.
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Total Summary */}
            <div className="bg-varena-espresso text-varena-ivory p-6 rounded-2xl shadow-md space-y-4">
              <h2 className="font-serif text-lg font-bold text-varena-gold-light">Ringkasan Pesanan</h2>

              <div className="space-y-2 text-xs text-varena-ivory/80 pb-4 border-b border-[#4A3B30]">
                {selectedItems.length > 0 ? (
                  selectedItems.map((it) => (
                    <div key={it.variant.id} className="flex justify-between items-center text-[11px]">
                      <span className="truncate pr-2">
                        {it.quantity}x {it.variant.name}
                      </span>
                      <span className="font-mono text-varena-gold-light whitespace-nowrap">
                        Rp{it.lineTotal.toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-2 text-varena-taupe text-[11px]">
                    Belum ada produk yang dipilih
                  </div>
                )}

                <div className="flex justify-between pt-2 border-t border-[#4A3B30]/60">
                  <span>Subtotal ({totalItemsCount} item)</span>
                  <span className="font-semibold text-varena-ivory">Rp{subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Ongkos Kirim</span>
                  {isStockist ? (
                    <span className="text-emerald-400 font-semibold">Gratis (Ditanggung Kantor Pusat)</span>
                  ) : (
                    <span className="text-varena-gold-light font-semibold">
                      Rp{shippingCost.toLocaleString('id-ID')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-base font-bold">
                <span>Total Tagihan:</span>
                <span className="font-serif text-2xl text-varena-gold-light">
                  Rp{total.toLocaleString('id-ID')}
                </span>
              </div>
              <p className="text-[10px] text-varena-gold-light/70">
                + kode unik 3 digit akan ditambahkan otomatis untuk verifikasi bank
              </p>

              {/* ── PILIH METODE PEMBAYARAN ── */}
              {isExistingMember && (
                <div className="pt-2 space-y-2">
                  <div className="text-xs font-bold text-varena-ivory/80 uppercase tracking-wider">
                    Metode Pembayaran:
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {/* Opsi Transfer Manual */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('TRANSFER')}
                      className={`p-3 rounded-xl border-2 text-left transition ${
                        paymentMethod === 'TRANSFER'
                          ? 'border-varena-gold bg-varena-gold/10'
                          : 'border-[#4A3B30] bg-transparent hover:border-varena-gold/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${paymentMethod === 'TRANSFER' ? 'border-varena-gold' : 'border-varena-taupe'}`}>
                          {paymentMethod === 'TRANSFER' && <span className="w-2 h-2 rounded-full bg-varena-gold block" />}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-varena-ivory">Transfer Bank Manual</div>
                          <div className="text-[11px] text-varena-taupe-light mt-0.5">
                            Transfer ke rekening VARENA + kode unik, verifikasi admin 1×24 jam
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Opsi Bayar via Saldo Deposit */}
                    <button
                      type="button"
                      onClick={() => shoppingDepositBalance >= total ? setPaymentMethod('DEPOSIT') : undefined}
                      disabled={shoppingDepositBalance < total}
                      className={`p-3 rounded-xl border-2 text-left transition ${
                        paymentMethod === 'DEPOSIT'
                          ? 'border-emerald-400 bg-emerald-900/20'
                          : shoppingDepositBalance >= total
                          ? 'border-[#4A3B30] bg-transparent hover:border-emerald-500/60'
                          : 'border-[#3A2A20] bg-transparent opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${paymentMethod === 'DEPOSIT' ? 'border-emerald-400' : 'border-varena-taupe'}`}>
                          {paymentMethod === 'DEPOSIT' && <span className="w-2 h-2 rounded-full bg-emerald-400 block" />}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-varena-ivory">Saldo Deposit Belanja</span>
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${shoppingDepositBalance >= total ? 'bg-emerald-800/50 text-emerald-300' : 'bg-red-900/40 text-red-400'}`}>
                              Rp{shoppingDepositBalance.toLocaleString('id-ID')}
                            </span>
                          </div>
                          <div className="text-[11px] text-varena-taupe-light mt-0.5">
                            {shoppingDepositBalance >= total
                              ? '✓ Langsung lunas & diproses otomatis, tanpa transfer'
                              : `Saldo kurang Rp${Math.max(0, total - shoppingDepositBalance).toLocaleString('id-ID')} · Topup dulu di dashboard`}
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                  {paymentMethod === 'DEPOSIT' && (
                    <div className="text-[11px] text-emerald-300 bg-emerald-900/20 border border-emerald-700/40 rounded-lg px-3 py-2">
                      ✓ Pesanan akan <strong>langsung berstatus Lunas</strong> dan segera diproses pengiriman tanpa menunggu verifikasi admin.
                    </div>
                  )}
                </div>
              )}

              {isNewRegistrationFlow && !hasFirstPackSelected && (
                <div className="p-2.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[11px]">
                  ⚠️ Wajib memilih minimal 1 box Kopi Premium (Rp500.000) untuk aktivasi keanggotaan.
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !canSubmitOrder}
                className="w-full py-3.5 rounded-xl bg-varena-gold text-varena-espresso font-semibold text-sm hover:bg-varena-gold-hover transition disabled:opacity-40 flex items-center justify-center gap-2 shadow"
              >
                {loading ? 'Membuat Pesanan...' : 'Buat Pesanan Sekarang'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-[10px] text-varena-taupe-light text-center flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-varena-gold-light" />
                <span>Transaksi dijamin aman & sesuai syariah / hukum dagang</span>
              </div>
            </div>
          </div>
        </form>
      ) : (
        /* Order Created & Payment Settlement Simulator */
        <div className="bg-white border border-varena-taupe/20 rounded-2xl p-6 sm:p-10 shadow-sm max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-3">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-varena-espresso">
              {orderResult.orderStatus === 'PAID' || orderResult.status === 'PAID'
                ? 'Pesanan Telah Dibayar'
                : 'Instruksi Pembayaran Pesanan'}
            </h2>
            <p className="text-xs text-varena-taupe mt-1 font-mono">
              Nomor Pesanan: {orderResult.orderNumber}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-varena-ivory-light border border-varena-taupe/20 space-y-2 text-xs">
            {orderResult.items && orderResult.items.length > 0 && (
              <div className="pb-2 mb-2 border-b border-varena-taupe/20 space-y-1">
                <div className="text-[10px] text-varena-taupe uppercase font-bold tracking-wider">
                  Produk yang Dipesan:
                </div>
                {orderResult.items.map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-varena-espresso font-medium">
                    <span>
                      {it.quantity}x {it.name || it.nameSnapshot}
                    </span>
                    <span className="font-mono">
                      Rp{(it.lineTotal || it.price * it.quantity || it.unitPrice * it.quantity).toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-varena-taupe">Total Tagihan:</span>
              <span className="font-bold text-varena-espresso text-sm">
                Rp{orderResult.total.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-varena-taupe">Status Pesanan:</span>
              <span
                className={`px-2.5 py-0.5 rounded font-semibold text-xs border ${
                  orderResult.paymentConfirmationStatus === 'SUBMITTED'
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                {formatOrderStatus(orderResult.orderStatus || orderResult.status, orderResult.paymentConfirmationStatus)}
              </span>
            </div>
          </div>

          {!settleResult ? (
            <div className="p-5 rounded-xl border-2 border-dashed border-varena-gold/60 bg-amber-50/40 space-y-4">
              <div className="text-center">
                <div className="text-xs font-bold text-varena-espresso flex items-center justify-center gap-1.5 mb-3">
                  <CreditCard className="w-4 h-4 text-varena-gold" />
                  <span>Instruksi Pembayaran Transfer Bank</span>
                </div>

                {/* 24-Hour Countdown Timer / Status */}
                {orderResult.orderStatus === 'CANCELLED' ? (
                  <div className="mb-3 p-3.5 rounded-xl bg-red-100 border border-red-300 text-red-900 text-xs text-left flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-bold">Pesanan Kedaluwarsa / Dibatalkan</p>
                      <p className="text-[11px] text-red-700 mt-0.5 leading-relaxed">
                        Batas waktu pembayaran 1 jam telah habis dan belum ada konfirmasi pembayaran. Stok produk telah dikembalikan otomatis. Silakan buat pesanan baru jika ingin melanjutkan.
                      </p>
                    </div>
                  </div>
                ) : orderResult.paymentConfirmationStatus === 'SUBMITTED' ? (
                  <div className="mb-3 p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs text-left flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-bold">Konfirmasi Pembayaran Telah Dikirim</p>
                      <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                        Data transfer dan konfirmasi Anda telah tercatat dan sedang diverifikasi oleh Tim Finance VARENA. Pesanan Anda aman dan tidak akan dibatalkan otomatis.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-amber-900">
                      <Clock className="w-4 h-4 text-amber-600 animate-pulse flex-shrink-0" />
                      <div className="text-left">
                        <div className="font-bold text-[11px] uppercase tracking-wide">Batas Waktu Pembayaran (1 Jam)</div>
                        <div className="text-[10px] text-amber-700">Pesanan otomatis batal jika melewati batas ini.</div>
                      </div>
                    </div>
                    {timeLeft ? (
                      <div className="font-mono font-bold text-amber-900 text-sm bg-white/80 px-2.5 py-1 rounded-lg border border-amber-300/50 shadow-2xs">
                        {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                      </div>
                    ) : (
                      <span className="text-[11px] font-mono text-stone-500">01:00:00</span>
                    )}
                  </div>
                )}

                {/* Bank destination */}
                <div className="p-3.5 rounded-lg bg-white border border-varena-gold/30 text-left space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-varena-taupe uppercase font-bold tracking-wider">
                      Transfer ke Rekening:
                    </div>
                    <button
                      type="button"
                      onClick={() => copyAccountNumber(PRIMARY_COMPANY_BANK.accountNumberClean)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-varena-espresso bg-varena-gold/15 hover:bg-varena-gold/30 px-2 py-0.5 rounded transition"
                      title="Salin Nomor Rekening"
                    >
                      {copiedBank ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-varena-espresso" />
                          <span>Salin No. Rek</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-base font-bold text-varena-espresso tracking-wide">
                    {PRIMARY_COMPANY_BANK.accountNumber}
                  </div>
                  <div className="text-xs font-semibold text-varena-espresso flex items-center justify-between">
                    <span>Bank {PRIMARY_COMPANY_BANK.bankName}</span>
                    <span className="text-stone-600 font-medium">
                      a.n. {PRIMARY_COMPANY_BANK.accountHolder}
                    </span>
                  </div>
                  {PRIMARY_COMPANY_BANK.statusNote && (
                    <div className="text-[10px] text-stone-500 italic">
                      *{PRIMARY_COMPANY_BANK.statusNote}
                    </div>
                  )}
                </div>

                {/* Exact amount */}
                <div className="mt-3 p-3.5 rounded-lg bg-varena-espresso text-center">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-varena-gold-light/75 uppercase font-bold tracking-wider text-left">
                      Nominal Yang Harus Ditransfer:
                    </span>
                    <button
                      type="button"
                      onClick={() => copyAmount(orderResult.total)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-varena-espresso bg-varena-gold-light hover:bg-white px-2.5 py-0.5 rounded transition shadow-xs"
                      title="Salin Angka Nominal Transfer"
                    >
                      {copiedAmount ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-700" />
                          <span className="text-emerald-800">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-varena-espresso" />
                          <span>Salin Nominal</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-serif text-2xl font-bold text-varena-gold-light tracking-tight">
                    Rp{orderResult.total.toLocaleString('id-ID')}
                  </div>
                  {uniqueCode > 0 && (
                    <div className="text-[11px] text-varena-gold-light/85 mt-1 font-medium">
                      (termasuk kode unik: +Rp{uniqueCode} untuk verifikasi otomatis)
                    </div>
                  )}
                </div>

                {/* Warning */}
                <div className="mt-3 p-2.5 rounded-lg bg-amber-100 border border-amber-300 text-left">
                  <div className="text-[11px] text-amber-900 font-semibold">⚠ Penting:</div>
                  <div className="text-[11px] text-amber-800">
                    Transfer nominal EXACT termasuk {uniqueCode} digit terakhir. Segera klik tombol konfirmasi di bawah setelah Anda melakukan transfer.
                  </div>
                </div>
              </div>

              {/* Tombol Utama: Konfirmasi Pembayaran oleh Mitra */}
              {orderResult.orderStatus !== 'CANCELLED' && (
                <div className="pt-2">
                  {orderResult.paymentConfirmationStatus === 'SUBMITTED' ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-3 px-4 rounded-xl bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center gap-2 border border-blue-200 cursor-not-allowed"
                    >
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span>Konfirmasi Terkirim (Menunggu Verifikasi Admin)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmTransferAmount(String(orderResult.total));
                        setShowConfirmModal(true);
                      }}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-md active:scale-[0.99]"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>✓ Saya Sudah Bayar (Konfirmasi Pembayaran)</span>
                    </button>
                  )}
                </div>
              )}

              {/* Wrong transfer link */}
              <div className="pt-1 text-center">
                <Link
                  href={`/confirm-payment?orderNumber=${orderResult.orderNumber}`}
                  className="text-[11px] text-varena-gold hover:underline font-semibold"
                >
                  Salah nominal transfer? Klik di sini untuk konfirmasi manual alternatif →
                </Link>
              </div>

              {/* Simulate payment button (sandbox only) */}
              <button
                type="button"
                onClick={handleSimulatePayment}
                disabled={settling || orderResult.orderStatus === 'CANCELLED'}
                className="w-full py-2.5 rounded-lg bg-varena-espresso/60 text-varena-gold-light/80 font-semibold text-xs hover:bg-varena-espresso transition flex items-center justify-center gap-2 border border-dashed border-varena-gold/30 disabled:opacity-40"
              >
                {settling ? 'Memproses...' : '[DEV] Simulasikan Pembayaran Diterima'}
              </button>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs border-t border-varena-gold/20">
                <Link
                  href={`/track?orderNumber=${orderResult.orderNumber}`}
                  className="w-full sm:w-auto text-center py-2 px-3.5 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition font-medium flex items-center justify-center gap-1.5"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Lacak Pengiriman Pesanan Ini →</span>
                </Link>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Link
                    href="/member"
                    className="w-full sm:w-auto text-center py-2 px-3 rounded-lg border border-varena-taupe/30 text-varena-espresso hover:bg-varena-ivory transition font-medium"
                  >
                    Dashboard Member
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderResult(null);
                      setSettleResult(null);
                    }}
                    className="w-full sm:w-auto text-center py-2 px-3 text-varena-taupe hover:text-varena-espresso transition"
                  >
                    Pesanan Baru
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-4">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Pembayaran Lunas & Komisi Berhasil Dihitung!</span>
              </div>

              <div className="text-xs space-y-1.5 text-emerald-950 font-mono">
                <div>
                  Total Komisi Terdistribusi: Rp
                  {settleResult.commissionResult.totalDistributed.toLocaleString('id-ID')}
                </div>
                <div>
                  Alokasi Cadangan (Unallocated): Rp
                  {settleResult.commissionResult.unallocatedAmount.toLocaleString('id-ID')}
                </div>
                <div>
                  Jumlah Titik Penerima: {settleResult.commissionResult.itemCount} titik
                </div>
              </div>

              <div className="pt-3 border-t border-emerald-200 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/member/wallet"
                  className="flex-1 text-center py-2.5 rounded-lg bg-emerald-700 text-white font-semibold text-xs hover:bg-emerald-800 transition"
                >
                  Cek Dompet & Mutasi Buku Besar
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setOrderResult(null);
                    setSettleResult(null);
                  }}
                  className="py-2.5 px-4 rounded-lg border border-emerald-700 text-emerald-900 font-semibold text-xs hover:bg-emerald-100 transition"
                >
                  Buat Pesanan Lain
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: KONFIRMASI PEMBAYARAN OLEH MITRA ── */}
      {showConfirmModal && orderResult && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3.5 bg-stone-50">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-varena-gold" />
                <h3 className="font-serif text-sm sm:text-base font-bold text-varena-espresso">
                  Konfirmasi Pembayaran Transfer
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-stone-400 hover:text-stone-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmOrderPayment} className="p-5 space-y-4 text-xs">
              {confirmSuccessMsg ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center space-y-2">
                  <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="font-bold text-sm">Konfirmasi Berhasil Dikirim!</p>
                  <p className="text-xs text-emerald-700 leading-relaxed">{confirmSuccessMsg}</p>
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                    <div className="font-semibold text-[11px] uppercase tracking-wider text-amber-800">
                      Pesanan: <span className="font-mono font-bold text-varena-espresso">{orderResult.orderNumber}</span>
                    </div>
                    <div className="text-xs">
                      Total Tagihan: <strong className="font-mono text-varena-espresso font-bold">Rp{orderResult.total?.toLocaleString('id-ID')}</strong> (termasuk kode unik)
                    </div>
                  </div>

                  {/* Rekening Pengirim (Default dari Setting atau Manual) */}
                  <div className="space-y-1.5">
                    <label className="block font-bold text-varena-espresso">
                      Rekening Bank Pengirim (Asal Transfer) *
                    </label>

                    {savedBank && confirmBankMode === 'SAVED' ? (
                      <div className="p-3 rounded-xl border border-varena-gold/50 bg-gradient-to-br from-amber-50/50 to-white space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-varena-gold tracking-wider">
                            ✓ Rekening Tersimpan di Akun
                          </span>
                          <button
                            type="button"
                            onClick={() => setConfirmBankMode('MANUAL')}
                            className="text-[11px] font-semibold text-varena-espresso hover:text-varena-gold hover:underline"
                          >
                            Transfer dari Bank Lain →
                          </button>
                        </div>
                        <div className="font-bold text-sm text-varena-espresso">
                          Bank {savedBank.bankName} - <span className="font-mono">{savedBank.accountNumber}</span>
                        </div>
                        <div className="text-[11px] text-stone-600">
                          a.n. <strong>{savedBank.accountHolder}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 p-3 rounded-xl bg-stone-50 border border-stone-200">
                        {savedBank && (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => setConfirmBankMode('SAVED')}
                              className="text-[11px] font-bold text-varena-gold hover:underline"
                            >
                              ← Gunakan Rekening Tersimpan Saya
                            </button>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-stone-600 text-[11px] font-semibold mb-0.5">Nama Bank *</label>
                            <input
                              type="text"
                              required
                              value={confirmBankName}
                              onChange={(e) => setConfirmBankName(e.target.value)}
                              placeholder="BCA / BRI / Mandiri"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs focus:outline-none focus:border-varena-gold"
                            />
                          </div>
                          <div>
                            <label className="block text-stone-600 text-[11px] font-semibold mb-0.5">Nomor Rekening *</label>
                            <input
                              type="text"
                              required
                              value={confirmAccountNumber}
                              onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
                              placeholder="1234567890"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-mono focus:outline-none focus:border-varena-gold"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-stone-600 text-[11px] font-semibold mb-0.5">Nama Pemilik Rekening *</label>
                          <input
                            type="text"
                            required
                            value={confirmAccountHolder}
                            onChange={(e) => setConfirmAccountHolder(e.target.value)}
                            placeholder="Sesuai buku tabungan"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs focus:outline-none focus:border-varena-gold"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Nominal Ditransfer */}
                  <div>
                    <label className="block font-bold text-varena-espresso mb-1">
                      Nominal Yang Anda Transfer (Rp) *
                    </label>
                    <input
                      type="number"
                      required
                      value={confirmTransferAmount}
                      onChange={(e) => setConfirmTransferAmount(e.target.value)}
                      placeholder={String(orderResult.total)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-mono font-bold focus:outline-none focus:border-varena-gold"
                    />
                    <span className="text-[10px] text-stone-500 mt-0.5 block">
                      Pastikan sesuai dengan nominal transfer di m-banking / ATM.
                    </span>
                  </div>

                  {/* Upload Bukti Transfer */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-varena-espresso text-xs">
                        Unggah Bukti Transfer / Struk (Opsional / Dianjurkan)
                      </label>
                      {compressionInfo && (
                        <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          ✓ {compressionInfo}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-stone-300 hover:border-varena-gold rounded-lg cursor-pointer bg-stone-50 text-stone-600 text-xs transition">
                        <Upload className="w-4 h-4 text-stone-500" />
                        <span className="truncate">
                          {compressingProof
                            ? 'Mengompresi ke WebP...'
                            : confirmProofFile
                            ? confirmProofFile.name
                            : 'Pilih Foto / Screenshot Transfer'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            try {
                              setCompressingProof(true);
                              const res = await compressImageToWebP(f, { maxWidth: 1000, quality: 0.82 });
                              setConfirmProofFile(res.file);
                              setConfirmProofPreview(res.previewUrl);
                              setCompressionInfo(`${res.originalSizeKb}KB ➔ ${res.compressedSizeKb}KB WebP (${res.compressionRatio})`);
                            } catch {
                              setConfirmProofFile(f);
                            } finally {
                              setCompressingProof(false);
                            }
                          }}
                        />
                      </label>
                      {confirmProofFile && (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmProofFile(null);
                            setConfirmProofPreview('');
                            setCompressionInfo('');
                          }}
                          className="text-xs text-red-600 hover:underline px-1 whitespace-nowrap"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                    {confirmProofPreview && (
                      <div className="mt-2 relative w-24 h-24 rounded-lg overflow-hidden border border-stone-200 shadow-2xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={confirmProofPreview}
                          alt="Preview Bukti Transfer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  {/* Catatan */}
                  <div>
                    <label className="block font-bold text-varena-espresso mb-1">Catatan Tambahan (Opsional)</label>
                    <input
                      type="text"
                      value={confirmNotes}
                      onChange={(e) => setConfirmNotes(e.target.value)}
                      placeholder="Contoh: Transfer via BCA Mobile pukul 14:30"
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs focus:outline-none focus:border-varena-gold"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-200">
                    <button
                      type="button"
                      onClick={() => setShowConfirmModal(false)}
                      className="py-2 px-4 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={confirmSubmitting}
                      className="py-2 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {confirmSubmitting ? 'Mengirim...' : 'Kirim Konfirmasi Bayar'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={<div className="text-center py-20 text-sm text-varena-taupe">Memuat checkout...</div>}
    >
      <CheckoutContent />
    </Suspense>
  );
}
