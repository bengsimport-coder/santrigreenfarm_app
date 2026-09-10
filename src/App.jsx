import React, { useState, useEffect, useMemo, useRef, Component } = 'react';
import { 
  Sprout, ClipboardList, CalendarDays, DollarSign, TrendingUp, BookOpen, Package, 
  RefreshCw, Cloud, Upload, Copy, ClipboardPaste, Trash2, Search, CheckCircle2, 
  Lock, Sparkles, Camera, ChevronDown, ChevronUp, Leaf, AlertTriangle, Check, 
  Activity, Mic, MicOff, FileText, Plus, Send, Bot, User, RotateCcw, Undo, 
  Redo, Printer, Eye, EyeOff, FileSpreadsheet, ShieldCheck, Save, HeartPulse, Settings 
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { initializeFirestore, getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

// --- KATEGORI TANAMAN ---
const PLANT_CATEGORIES = [
  { id: 'cabai', label: '🌶️ Cabai' },
  { id: 'cabai_besar', label: '🌶️ Cabai Besar' },
  { id: 'tomat', label: '🍅 Tomat' },
  { id: 'terong', label: '🍆 Terong' },
  { id: 'melon', label: '🍈 Melon' },
  { id: 'timun', label: '🥒 Timun' },
  { id: 'seledri', label: '🌿 Seledri' },
  { id: 'bawang', label: '🧅 Bawang' }
];

const phaseKeys = [
  { key: 'pengolahanLahan', title: '1. Pengolahan Lahan & Pra-Tanam' },
  { key: 'masaVegetatif', title: '2. Masa Vegetatif (Pertumbuhan)' },
  { key: 'faseBunga', title: '3. Fase Pembungaan' },
  { key: 'fasePembesaran', title: '4. Fase Pembesaran Buah' },
  { key: 'fasePematangan', title: '5. Fase Pematangan & Panen' }
];

// --- KONFIGURASI DEFAULT FIREBASE SANTRI GREEN FARM ---
const defaultSantriFirebaseConfig = {
  apiKey: "AIzaSyCffu9zyM8huGpkLQ_hTFTTacVYfpIMyVQ",
  authDomain: "santrigreenfarm-8fcfc.firebaseapp.com",
  projectId: "santrigreenfarm-8fcfc",
  storageBucket: "santrigreenfarm-8fcfc.firebasestorage.app",
  messagingSenderId: "316371676447",
  appId: "1:316371676447:web:c67813e78c372a0ab0d42a",
  measurementId: "G-3GXJVYQ3R1"
};

const getActiveFirebaseConfig = () => {
  try {
    const savedCustomConfig = localStorage.getItem('catatan_pertanian_custom_firebase_config');
    if (savedCustomConfig) return JSON.parse(savedCustomConfig);
  } catch (e) {
    console.warn("Gagal membaca konfigurasi Firebase kustom dari localStorage:", e);
  }
  return defaultSantriFirebaseConfig;
};

const firebaseConfig = getActiveFirebaseConfig();
let firebaseApp = null, auth = null, db = null;
try {
  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = initializeFirestore(firebaseApp, { experimentalAutoDetectLongPolling: true });
} catch (e) {
  try { db = getFirestore(firebaseApp); } catch (err) { console.warn("Fallback Firestore error:", err); }
}

const generateEmptyBahanRow = () => ({ nama: '', dosis: '', harga: 0, isi: 0, isCompleted: false });
const generateEmptyFasePhaseRow = () => ({ 
  umur: '', cara: 'Kocor', resep: '', takaran: '', volume: '', 
  bahan: [generateEmptyBahanRow()], isCompleted: false, isApplied: false, 
  catatanEvaluasi: '', tinggiPohon: '', jumlahDaun: '', jumlahBuah: '', jumlahMataTunas: '', 
  fotoLahan: '', fotoLahan2: '', fotoLahan3: '', diagnosaAi: '', diagnosaRacikanAi: '', diagnosaAiChat: [] 
});

const generateEmptySubTab = (id, title) => ({
  id, title, customTitle: '', namaMetode: '', tanggalHst: '', kodePolibag: '', populasiAktual: '1000', targetResep: '1000',
  procedures: [],
  materials: [],
  content: { source: '', pengolahanLahan: [], masaVegetatif: [], faseBunga: [], fasePembesaran: [], fasePematangan: [] }
});

const generateInitialPlantSubTabs = () => Array.from({ length: 9 }, (_, i) => generateEmptySubTab(`cara${i + 1}`, `Cara ${i + 1}`));
const generateEmptyStokGudangRow = () => ({ nama: '', stokSaatIni: '', hargaTerbaru: '', isiKemasan: '' });
const generateEmptyMasterItemRow = () => ({ nama: '', namaSamaran: '', harga: '', isi: '', kandungan: '', fungsi: '', dosisRekomendasi: '' });

const initialActivities = [
  { id: 'dokter_ai', title: 'Dokter AI', icon: 'Sparkles', isMultiPlant: false },
  { id: 'aplikasimetode', title: 'Aplikasi Metode', icon: 'Sprout', isMultiPlant: true, plants: {
    cabai: generateInitialPlantSubTabs(), cabai_besar: generateInitialPlantSubTabs(), tomat: generateInitialPlantSubTabs(), 
    terong: generateInitialPlantSubTabs(), melon: generateInitialPlantSubTabs(), timun: generateInitialPlantSubTabs(), 
    seledri: generateInitialPlantSubTabs(), bawang: generateInitialPlantSubTabs()
  }},
  { id: 'penyembuhan', title: 'Penyembuhan', icon: 'HeartPulse', isMultiPlant: false, subTabs: generateInitialPlantSubTabs() },
  { id: 'kalender', title: 'Kalender Kerja', icon: 'CalendarDays', isMultiPlant: false, subTabs: [{ id: 'kalender', title: 'Kalender Kerja', items: Array.from({ length: 25 }, generateEmptyStokGudangRow), selectedAnalysisKeys: [] }] },
  { id: 'stokgudang', title: 'Stok Gudang', icon: 'Package', isMultiPlant: false, subTabs: [{ id: 'stok', title: 'Stok Gudang', items: Array.from({ length: 25 }, generateEmptyStokGudangRow) }] },
  { id: 'daftarharga', title: 'Database Harga', icon: 'DollarSign', isMultiPlant: false, subTabs: [{ id: 'master', title: 'Database Obat & Pupuk', items: Array.from({ length: 30 }, generateEmptyMasterItemRow) }] },
  { id: 'analisis', title: 'Analisis Pertumbuhan', icon: 'TrendingUp', isMultiPlant: false }
];

const parseNum = (str) => {
  if (!str) return 0;
  let s = String(str).trim();
  if (!s) return 0;
  if (s.includes('.')) {
    const parts = s.split('.');
    if (parts.length > 1 && parts.slice(1).every(p => p.length === 3)) s = s.replace(/\./g, '');
    else s = s.replace(/\./g, ',');
  }
  const parsed = parseFloat(s.replace(',', '.'));
  return isNaN(parsed) ? 0 : parsed;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('stokgudang');
  const [activePlant, setActivePlant] = useState('cabai');
  const [activeSubTab, setActiveSubTab] = useState('cara1');
  const [activities, setActivities] = useState(initialActivities);
  const [isAdmin, setIsAdmin] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [rawConfigInput, setRawConfigInput] = useState('');

  // Auto-Save ke LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('catatan_pertanian_v19_data');
    if (saved) {
      try { setActivities(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  const handleSaveData = () => {
    localStorage.setItem('catatan_pertanian_v19_data', JSON.stringify(activities));
    alert("✅ Data berhasil disimpan!");
  };

  const handleConfigSave = () => {
    if (!rawConfigInput.trim()) return;
    try {
      let configObj = null;
      if (rawConfigInput.includes('{')) {
        const jsonStr = rawConfigInput.substring(rawConfigInput.indexOf('{'), rawConfigInput.lastIndexOf('}') + 1);
        configObj = JSON.parse(jsonStr.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":').replace(/'/g, '"'));
      }
      if (configObj && configObj.apiKey) {
        localStorage.setItem('catatan_pertanian_custom_firebase_config', JSON.stringify(configObj));
        alert("✅ Konfigurasi Firebase berhasil diperbarui! Halaman akan dimuat ulang.");
        window.location.reload();
      } else {
        alert("❌ Format konfigurasi tidak valid.");
      }
    } catch (e) {
      alert("❌ Gagal memproses teks konfigurasi. Pastikan formatnya benar.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 space-y-4 font-sans text-gray-800">
      {/* Header */}
      <header className="bg-emerald-700 text-white rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Sprout className="w-7 h-7 text-emerald-300" />
            Catatan Pertanian v1.9
          </h1>
          <p className="text-xs text-emerald-100">Sistem Manajemen Pertanian & Nutrisi Presisi</p>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className="bg-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-500 font-mono">
              ☁️ Awan Online (SANTRIGREENFARM)
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setShowConfigModal(true)}
            className="bg-emerald-800 hover:bg-emerald-900 border border-emerald-400 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow transition"
          >
            <Settings className="w-4 h-4" /> Config Firebase
          </button>
          <button 
            onClick={handleSaveData}
            className="bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-bold px-3 py-2 rounded-xl shadow flex items-center gap-1.5 transition"
          >
            <Save className="w-4 h-4" /> Simpan Manual
          </button>
        </div>
      </header>

      {/* Navigasi Utama Tab */}
      <nav className="flex flex-wrap gap-1.5 bg-white p-2 rounded-2xl shadow-sm border border-gray-200">
        {activities.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
              activeTab === tab.id 
                ? 'bg-emerald-600 text-white shadow-md' 
                : 'bg-transparent text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.id === 'stokgudang' && <Package className="w-4 h-4" />}
            {tab.id === 'daftarharga' && <DollarSign className="w-4 h-4" />}
            {tab.id === 'aplikasimetode' && <Sprout className="w-4 h-4" />}
            {tab.id === 'penyembuhan' && <HeartPulse className="w-4 h-4" />}
            {tab.id === 'kalender' && <CalendarDays className="w-4 h-4" />}
            {tab.id === 'analisis' && <TrendingUp className="w-4 h-4" />}
            {tab.id === 'dokter_ai' && <Sparkles className="w-4 h-4" />}
            {tab.title}
          </button>
        ))}
      </nav>

      {/* SUB-NAVIGASI TANAMAN (Untuk Aplikasi Metode) */}
      {activeTab === 'aplikasimetode' && (
        <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100 flex flex-wrap gap-2">
          {PLANT_CATEGORIES.map(plant => (
            <button
              key={plant.id}
              onClick={() => setActivePlant(plant.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activePlant === plant.id
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-white text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              {plant.label}
            </button>
          ))}
        </div>
      )}

      {/* SUB-TAB CARA 1 - CARA 9 (Aplikasi Metode & Penyembuhan) */}
      {(activeTab === 'aplikasimetode' || activeTab === 'penyembuhan') && (
        <div className="flex flex-wrap gap-1.5 bg-gray-100 p-1.5 rounded-xl">
          {Array.from({ length: 9 }, (_, i) => `cara${i + 1}`).map((subId, idx) => (
            <button
              key={subId}
              onClick={() => setActiveSubTab(subId)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeSubTab === subId
                  ? 'bg-white text-emerald-800 shadow-sm font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Cara {idx + 1}
            </button>
          ))}
        </div>
      )}

      {/* KONTEN UTAMA TAB */}
      <main className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-200 min-h-[450px]">
        {/* TAB STOK GUDANG */}
        {activeTab === 'stokgudang' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-2 border-b pb-3">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" /> Inventaris Stok Gudang
              </h2>
              <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                Item baru berada di baris atas
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse border border-gray-200">
                <thead className="bg-emerald-100 text-emerald-950 font-bold border-b border-gray-200">
                  <tr>
                    <th className="p-3 border border-gray-200 text-center w-12">No</th>
                    <th className="p-3 border border-gray-200">Nama Bahan Nutrisi / Obat</th>
                    <th className="p-3 border border-gray-200 text-center">Stok Gudang</th>
                    <th className="p-3 border border-gray-200 text-right">Harga Terbaru (Rp)</th>
                    <th className="p-3 border border-gray-200 text-center">Isi Kemasan</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: 1, nama: 'Pupuk AB Mix Super', stok: '50', harga: '85000', isi: '1000 ml' },
                    { id: 2, nama: 'Insektisida Abamektin', stok: '12', harga: '65000', isi: '500 ml' },
                    { id: 3, nama: 'Fungisida Mankozeb', stok: '25', harga: '45000', isi: '1000 gram' },
                    { id: 4, nama: 'Kalsium Nitrat', stok: '30', harga: '35000', isi: '1000 gram' }
                  ].map((row, idx) => (
                    <tr key={row.id} className="hover:bg-emerald-50/50 border-b border-gray-200">
                      <td className="p-3 border border-gray-200 text-center font-bold text-gray-400">{idx + 1}</td>
                      <td className="p-3 border border-gray-200 font-bold text-gray-800">{row.nama}</td>
                      <td className="p-3 border border-gray-200 text-center font-extrabold text-emerald-700">{row.stok}</td>
                      <td className="p-3 border border-gray-200 text-right font-mono">Rp {Number(row.harga).toLocaleString('id-ID')}</td>
                      <td className="p-3 border border-gray-200 text-center text-gray-600">{row.isi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB APLIKASI METODE & PENYEMBUHAN */}
        {(activeTab === 'aplikasimetode' || activeTab === 'penyembuhan') && (
          <div className="space-y-6">
            <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200 flex flex-wrap justify-between items-center gap-3">
              <div>
                <h3 className="text-sm font-bold text-emerald-950 uppercase tracking-wide">
                  {activeTab === 'aplikasimetode' ? `Prosedur ${activePlant.replace('_', ' ')} - ${activeSubTab.toUpperCase()}` : `Metode Penanganan ${activeSubTab.toUpperCase()}`}
                </h3>
                <p className="text-xs text-emerald-700">Atur takaran, volume, dan eksekusi pemotongan stok bahan.</p>
              </div>
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Tambah Baris HST
              </button>
            </div>

            {phaseKeys.map(fase => (
              <div key={fase.key} className="space-y-3">
                <h4 className="text-xs font-extrabold text-emerald-800 uppercase bg-emerald-100/70 px-3 py-1.5 rounded-lg w-fit">
                  {fase.title}
                </h4>
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-100 text-gray-700 font-bold border-b">
                      <tr>
                        <th className="p-2.5 border-r w-16 text-center">HST</th>
                        <th className="p-2.5 border-r w-24 text-center">Cara</th>
                        <th className="p-2.5 border-r">Resep / Racikan Bahan</th>
                        <th className="p-2.5 border-r w-24 text-center">Takaran</th>
                        <th className="p-2.5 border-r w-24 text-center">Vol/Pohon</th>
                        <th className="p-2.5 text-center w-36">Status & Eksekusi</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="p-2.5 border-r text-center font-bold text-emerald-700">HST 1</td>
                        <td className="p-2.5 border-r text-center">
                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">Kocor</span>
                        </td>
                        <td className="p-2.5 border-r font-medium text-gray-800">AB Mix Super (5ml) + Kalsium Nitrat (2g)</td>
                        <td className="p-2.5 border-r text-center">5 ml/L</td>
                        <td className="p-2.5 border-r text-[11px] text-center">200 ml</td>
                        <td className="p-2.5 text-center space-y-1">
                          <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1 px-2 rounded flex items-center justify-center gap-1 shadow-sm">
                            <Check className="w-3 h-3" /> Potong Stok
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB KALENDER KERJA */}
        {activeTab === 'kalender' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-emerald-600" /> Agenda & Monitoring Pertumbuhan Lahan
              </h2>
              <button className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
                <Printer className="w-3.5 h-3.5" /> Cetak PDF
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 5, 10, 15, 20, 25].map(hst => (
                <div key={hst} className="border border-emerald-200 rounded-2xl p-4 bg-emerald-50/30 space-y-3 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="bg-emerald-700 text-white text-sm font-black px-3 py-1 rounded-xl shadow-sm">
                      HST {hst}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                      Fase Vegetatif
                    </span>
                  </div>
                  
                  <div className="text-xs space-y-1 text-gray-700 bg-white p-2.5 rounded-xl border border-gray-100">
                    <p className="font-bold text-gray-900">🌿 Resep Nutrisi Kocor:</p>
                    <p>• AB Mix Super: 5 ml/L</p>
                    <p>• Volume: 200 ml / pohon</p>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100 space-y-2">
                    <p className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5" /> Data Analisis Pertumbuhan Lahan
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <input type="number" placeholder="Tinggi (cm)" className="p-1 border rounded text-center focus:outline-emerald-500" />
                      <input type="number" placeholder="Jml Daun" className="p-1 border rounded text-center focus:outline-emerald-500" />
                      <input type="number" placeholder="Jml Buah" className="p-1 border rounded text-center focus:outline-emerald-500" />
                      <input type="number" placeholder="Mata Tunas" className="p-1 border rounded text-center focus:outline-emerald-500" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB ANALISIS PERTUMBUHAN */}
        {activeTab === 'analisis' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-3 flex-wrap gap-2">
              <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" /> Perbandingan Multi-Metode & Analisis AI
              </h2>
              <button className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow flex items-center gap-1.5 transition">
                <Sparkles className="w-4 h-4" /> ⚡ Analisis Mana Metode Terbaik dengan AI
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
              <p className="text-xs font-bold text-gray-700">Pilih Metode yang Ingin Dibandingkan Berdampingan:</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {['Cabai Cara 1', 'Cabai Cara 2', 'Cabai Cara 3', 'Cabai Cara 4', 'Penyembuhan Cara 1'].map((m, i) => (
                  <label key={i} className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-200 cursor-pointer font-medium hover:bg-emerald-50">
                    <input type="checkbox" defaultChecked={i < 2} className="accent-emerald-600 rounded" />
                    {m}
                  </label>
                ))}
              </div>
            </div>

            <div className="h-64 bg-gray-50 rounded-2xl border border-gray-200 p-4 flex items-center justify-center text-gray-400 text-xs font-semibold">
              📈 [Grafik Kurva Multi-Metode Recharts Siap Ditampilkan]
            </div>
          </div>
        )}

        {/* TAB DOCTOR AI & DATABASE HARGA */}
        {(activeTab === 'dokter_ai' || activeTab === 'daftarharga') && (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              {activeTab === 'dokter_ai' ? '✨' : '💲'}
            </div>
            <h3 className="text-base font-bold text-gray-800 capitalize">
              Modul {activeTab.replace('_', ' ')} Siap Dijalankan
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Seluruh data terintegrasi secara dinamis dengan Firebase Cloud Santri Green Farm.
            </p>
          </div>
        )}
      </main>

      {/* MODAL CONFIG FIREBASE */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600" /> Konfigurasi Firebase Cloud
              </h3>
              <button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg">×</button>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Tempelkan blok objek <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-emerald-700">firebaseConfig</code> Anda dari Firebase Console:
            </p>
            <textarea
              rows="7"
              value={rawConfigInput}
              onChange={e => setRawConfigInput(e.target.value)}
              placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "...",\n  projectId: "..."\n};`}
              className="w-full p-3 border border-gray-300 rounded-2xl font-mono text-xs focus:outline-emerald-500 bg-gray-50/50"
            ></textarea>
            <div className="flex justify-end gap-2 pt-1">
              <button 
                onClick={() => setShowConfigModal(false)} 
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100"
              >
                Batal
              </button>
              <button 
                onClick={handleConfigSave} 
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow transition"
              >
                Simpan & Aktifkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
