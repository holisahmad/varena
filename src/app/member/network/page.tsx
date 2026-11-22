'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GitFork, Users, Search, ChevronRight, ArrowLeft, Shield, CheckCircle2 } from 'lucide-react';
import { formatMemberStatus } from '@/lib/formatters';
import { useNotifications } from '@/contexts/NotificationContext';

export default function MemberNetworkPage() {
  const router = useRouter();
  const { ackNetwork } = useNotifications();
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState<'placement' | 'sponsor'>('placement');

  // Placement Tree State
  const [currentRootCode, setCurrentRootCode] = useState<string>('VRN-LDR-03');
  const [treeNode, setTreeNode] = useState<any>(null);
  const [treeLoading, setTreeLoading] = useState(true);
  const [historyStack, setHistoryStack] = useState<string[]>([]);

  // Sponsor List State
  const [sponsorList, setSponsorList] = useState<any[]>([]);
  const [sponsorLoading, setSponsorLoading] = useState(false);

  // Search
  const [searchCode, setSearchCode] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('varena_user');
    if (!stored) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(stored);
    setUser(parsed);

    // Default focal root to user's member code or root leader
    const focal = parsed.memberCode || 'VRN-LDR-03';
    setCurrentRootCode(focal);
    loadPlacementTree(focal);
    loadSponsorList(focal);
    ackNetwork();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const loadPlacementTree = (code: string) => {
    setTreeLoading(true);
    fetch(`/api/v1/network/tree?rootCode=${code}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.node) {
          setTreeNode(data.node);
        }
      })
      .finally(() => setTreeLoading(false));
  };

  const loadSponsorList = (code: string) => {
    setSponsorLoading(true);
    fetch(`/api/v1/network/sponsor-list?memberCode=${code}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.referrals) {
          setSponsorList(data.referrals);
        }
      })
      .finally(() => setSponsorLoading(false));
  };

  const handleDrillDown = (childCode: string) => {
    setHistoryStack([...historyStack, currentRootCode]);
    setCurrentRootCode(childCode);
    loadPlacementTree(childCode);
  };

  const handleGoBack = () => {
    if (historyStack.length === 0) return;
    const prev = historyStack[historyStack.length - 1];
    setHistoryStack(historyStack.slice(0, -1));
    setCurrentRootCode(prev);
    loadPlacementTree(prev);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode) return;
    const clean = searchCode.trim().toUpperCase();
    setHistoryStack([...historyStack, currentRootCode]);
    setCurrentRootCode(clean);
    loadPlacementTree(clean);
    setSearchCode('');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Title & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-varena-espresso">
            Struktur Jaringan Kemitraan
          </h1>
          <p className="text-xs text-varena-taupe-dark mt-1">
            Separasi tegas antara Garis Sponsor (Direct) dan Pohon Penempatan (Placement).
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex flex-wrap p-1 rounded-xl bg-varena-ivory-surface border border-varena-taupe/20 text-xs font-semibold gap-1">
          <button
            onClick={() => setTab('placement')}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 ${
              tab === 'placement'
                ? 'bg-varena-espresso text-varena-gold-light shadow-sm'
                : 'text-varena-taupe hover:text-varena-espresso'
            }`}
          >
            <GitFork className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">Pohon Penempatan (Placement)</span>
            <span className="sm:hidden">Placement</span>
          </button>
          <button
            onClick={() => setTab('sponsor')}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-1.5 ${
              tab === 'sponsor'
                ? 'bg-varena-espresso text-varena-gold-light shadow-sm'
                : 'text-varena-taupe hover:text-varena-espresso'
            }`}
          >
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">Garis Sponsor Langsung</span>
            <span className="sm:hidden">Sponsor</span>
          </button>
        </div>
      </div>

      {tab === 'placement' ? (
        /* Placement Drilldown Tree View */
        <div className="space-y-4">
          {/* Controls: Search & Breadcrumbs */}
          <div className="bg-white p-4 rounded-2xl border border-varena-taupe/20 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              {historyStack.length > 0 && (
                <button
                  onClick={handleGoBack}
                  className="px-3 py-1.5 rounded-lg border border-varena-taupe/30 hover:bg-varena-ivory flex items-center gap-1 text-varena-espresso font-semibold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali ke Upline</span>
                </button>
              )}
              <div className="font-mono text-varena-taupe">
                Fokus Node: <span className="font-bold text-varena-espresso">{currentRootCode}</span>
              </div>
            </div>

            <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="Cari ID Mitra (cth: VRN-0001)"
                className="px-3 py-1.5 rounded-lg border border-varena-taupe/30 uppercase font-mono text-xs focus:outline-none focus:border-varena-gold flex-1 sm:w-48 min-w-0"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-varena-espresso text-varena-gold-light font-semibold shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {treeLoading ? (
            <div className="text-center py-20 text-sm text-varena-taupe">Memuat data silsilah...</div>
          ) : treeNode ? (
            <div className="space-y-6">
              {/* Focal Node Card */}
              <div className="bg-gradient-to-br from-varena-espresso-dark to-varena-espresso text-varena-ivory p-6 rounded-2xl border border-varena-gold/40 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-varena-gold-light font-mono">
                      Titik Aktif Saat Ini
                    </div>
                    <div className="font-serif text-2xl font-bold text-varena-ivory-light mt-0.5">
                      {treeNode.name}
                    </div>
                    <div className="text-xs text-varena-taupe-light font-mono mt-1">
                      ID: <span className="text-varena-gold-light font-bold">{treeNode.code}</span> · Status: {formatMemberStatus(treeNode.status)}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 text-xs">
                    {treeNode.parent && (
                      <div className="p-2.5 rounded-xl bg-black/30 border border-[#5A4535]">
                        <div className="text-[10px] text-varena-taupe-light">Upline Placement:</div>
                        <div className="font-semibold text-varena-gold-light">{treeNode.parent.name}</div>
                        <div className="text-[10px] font-mono text-varena-ivory/70">{treeNode.parent.code}</div>
                      </div>
                    )}
                    {treeNode.sponsor && (
                      <div className="p-2.5 rounded-xl bg-black/30 border border-[#5A4535]">
                        <div className="text-[10px] text-varena-taupe-light">Sponsor Pengundang:</div>
                        <div className="font-semibold text-varena-gold-light">{treeNode.sponsor.name}</div>
                        <div className="text-[10px] font-mono text-varena-ivory/70">{treeNode.sponsor.code}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Children Downlines */}
              <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg font-bold text-varena-espresso">
                    Downline Penempatan Langsung ({treeNode.children?.length || 0} Titik)
                  </h3>
                  <span className="text-xs text-varena-taupe">Klik untuk menjelajah ke bawah</span>
                </div>

                {treeNode.children && treeNode.children.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {treeNode.children.map((child: any) => (
                      <div
                        key={child.id}
                        onClick={() => handleDrillDown(child.code)}
                        className="p-4 rounded-xl border border-varena-taupe/20 hover:border-varena-gold bg-varena-ivory-light hover:bg-white transition cursor-pointer flex items-center justify-between shadow-sm"
                      >
                        <div>
                          <div className="font-semibold text-sm text-varena-espresso">{child.name}</div>
                          <div className="text-xs font-mono text-varena-taupe">{child.code}</div>
                          <div className="text-[10px] text-varena-gold font-medium mt-1">
                            Memiliki {child.childCount} downline langsung
                          </div>
                        </div>
                        <div className="p-2 rounded-full bg-varena-espresso text-varena-gold-light">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-xs text-varena-taupe bg-varena-ivory-light rounded-xl border border-dashed border-varena-taupe/30">
                    Belum ada downline placement yang ditempatkan langsung di bawah titik ini.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-sm text-red-600">Member tidak ditemukan.</div>
          )}
        </div>
      ) : (
        /* Sponsor List View */
        <div className="bg-white p-6 rounded-2xl border border-varena-taupe/20 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="font-serif text-lg font-bold text-varena-espresso">
              Daftar Mitra yang Anda Sponsori Langsung
            </h3>
            <span className="self-start sm:self-auto text-xs font-mono font-semibold text-varena-gold">
              Total: {sponsorList.length} Mitra
            </span>
          </div>

          {sponsorLoading ? (
            <div className="text-center py-12 text-xs text-varena-taupe">Memuat daftar sponsor...</div>
          ) : sponsorList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[560px]">
                <thead className="bg-varena-ivory-light text-varena-taupe uppercase font-semibold border-b border-varena-taupe/20">
                  <tr>
                    <th className="py-3 px-4">Kode Mitra</th>
                    <th className="py-3 px-4">Nama Lengkap</th>
                    <th className="py-3 px-4">Tanggal Bergabung</th>
                    <th className="py-3 px-4">Posisi Placement Upline</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-varena-taupe/10">
                  {sponsorList.map((m: any) => (
                    <tr key={m.id} className="hover:bg-varena-ivory-light/50">
                      <td className="py-3 px-4 font-mono font-bold text-varena-espresso">{m.code}</td>
                      <td className="py-3 px-4 font-semibold text-varena-espresso">{m.name}</td>
                      <td className="py-3 px-4 text-varena-taupe">{new Date(m.joinedAt).toLocaleDateString('id-ID')}</td>
                      <td className="py-3 px-4">
                        {m.placementParent ? (
                          <span className="font-mono text-varena-espresso">{m.placementParent.name} ({m.placementParent.code})</span>
                        ) : (
                          <span className="text-varena-taupe">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          {formatMemberStatus(m.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-varena-taupe bg-varena-ivory-light rounded-xl border border-dashed border-varena-taupe/30">
              Belum ada mitra yang Anda sponsori langsung. Bagikan tautan referral Anda untuk mulai membangun kemitraan.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

