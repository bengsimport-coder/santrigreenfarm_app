import React, { useState, useEffect, useMemo, useRef, Component } from 'react';

import { 
  Sprout, 
  ClipboardList, 
  CalendarDays, 
  DollarSign, 
  TrendingUp, 
  BookOpen, 
  Package, 
  RefreshCw, 
  Cloud, 
  Download, 
  Upload, 
  Copy, 
  ClipboardPaste, 
  Trash2, 
  Search, 
  CheckCircle2, 
  Lock, 
  Sparkles, 
  Camera, 
  ChevronDown, 
  ChevronUp, 
  Leaf,
  AlertTriangle,
  Check,
  Activity,
  Mic,
  MicOff,
  FileText,
  Plus,
  Send,
  Bot,
  User,
  RotateCcw,
  Undo,
  Redo,
  Printer,
  Eye,
  EyeOff,
  FileSpreadsheet,
  ShieldCheck,
  Save,
  HeartPulse,
  Settings
} from 'lucide-react';

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  initializeFirestore,
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  onSnapshot 
} from 'firebase/firestore';

const PLANT_CATEGORIES = [
  { id: 'cabai', label: '🌶️ Cabai' },
  { id: 'cabai_besar', label: '🌶️ Cabai Besar' },
  { id: 'tomat', label: '🍅 Tomat' },
  { id: 'terong', label: '🍆 Terong' },
  { id: 'melon', label: '🍈 Melon' },
  { id: 'timun', label: '🥒 Timun' },
  { id: 'seledri', label: '🥬 Seledri' },
  { id: 'bawang', label: '🧅 Bawang' }
];

const phaseKeys = [
  { key: 'pengolahanLahan', title: '1. Pengolahan Lahan & Pra-Tanam' },
  { key: 'masaVegetatif', title: '2. Masa Vegetatif (Pertumbuhan)' },
  { key: 'faseBunga', title: '3. Fase Pembungaan' },
  { key: 'fasePembesaran', title: '4. Fase Pembesaran Buah' },
  { key: 'fasePematangan', title: '5. Fase Pematangan & Panen' }
];

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
    if (savedCustomConfig) {
      return JSON.parse(savedCustomConfig);
    }
  } catch (e) {
    console.warn("Gagal membaca konfigurasi Firebase kustom dari localStorage:", e);
  }

  if (typeof __firebase_config !== 'undefined' && Boolean(__firebase_config) && !String(__firebase_config).includes("demo-key")) {
    try {
      return JSON.parse(__firebase_config);
    } catch (e) {}
  }

  return defaultSantriFirebaseConfig;
};

const firebaseConfig = getActiveFirebaseConfig();
const hasValidConfig = Boolean(firebaseConfig && firebaseConfig.apiKey);

let firebaseApp = null, auth = null, db = null;
if (hasValidConfig) {
  try {
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = initializeFirestore(firebaseApp, {
      experimentalAutoDetectLongPolling: true
    });
  } catch (e) {
    try {
      db = getFirestore(firebaseApp);
    } catch (err) {
      console.warn("Firestore initialization fallback:", err);
    }
  }
}

const appId = typeof __app_id !== 'undefined' ? __app_id : (firebaseConfig.projectId || 'catatan-pertanian-app');

const generateEmptyBahanRow = () => ({ nama: '', dosis: '', harga: 0, isi: 0, isCompleted: false });

const generateEmptyPhaseRow = () => ({
  umur: '',
  cara: 'Kocor',
  resep: '',
  takaran: '',
  volume: '',
  bahan: [generateEmptyBahanRow()],
  isCompleted: false,
  isApplied: false,
  catatanEvaluasi: '',
  tinggiPohon: '',
  jumlahDaun: '',
  jumlahBuah: '',
  jumlahMataTunas: '',
  fotoLahan: '',
  fotoLahan2: '',
  fotoLahan3: '',
  diagnosaAi: '',
  diagnosaRacikanAi: '',
  diagnosaAiChat: []
});

const generateEmptySubTab = (id, title) => ({
  id,
  title,
  customTitle: '',
  namaMetode: '',
  tanggalHst: '',
  kodePolibag: '',
  populasiAktual: '1000',
  targetResep: '1000',
  procedures: [],
  materials: [],
  content: '',
  source: '',
  pengolahanLahan: [],
  masaVegetatif: [],
  faseBunga: [],
  fasePembesaran: [],
  fasePematangan: []
});

const generateInitialPlantSubTabs = () => Array.from({ length: 9 }, (_, i) => generateEmptySubTab(`cara${i + 1}`, `Cara ${i + 1}`));

const generateEmptyStokGudangRow = () => ({ nama: '', stokSaatIni: '', hargaTerbaru: '', isiKemasan: '' });

const generateEmptyMasterItemRow = () => ({ nama: '', namaSamaran: '', harga: '', isi: '', kandungan: '', fungsi: '', dosisRekomendasi: '' });

const initialActivities = [
  { id: 'dokter_ai', title: 'Dokter AI', icon: 'Sparkles', isMultiPlant: false },
  {
    id: 'aplikasimetode',
    title: 'Aplikasi Metode',
    icon: 'Sprout',
    isMultiPlant: true,
    plants: {
      cabai: generateInitialPlantSubTabs(),
      cabai_besar: generateInitialPlantSubTabs(),
      tomat: generateInitialPlantSubTabs(),
      terong: generateInitialPlantSubTabs(),
      melon: generateInitialPlantSubTabs(),
      timun: generateInitialPlantSubTabs(),
      seledri: generateInitialPlantSubTabs(),
      bawang: generateInitialPlantSubTabs()
    }
  },
  { id: 'penyembuhan', title: 'Penyembuhan', icon: 'HeartPulse', isMultiPlant: false, subTabs: generateInitialPlantSubTabs() },
  { id: 'kalender', title: 'Kalender Kerja', icon: 'CalendarDays', isMultiPlant: false },
  { id: 'stokgudang', title: 'Stok Gudang', icon: 'Package', isMultiPlant: false, subTabs: [{ id: 'stok', title: 'Stok Gudang', items: Array.from({ length: 25 }, generateEmptyStokGudangRow), selectedAnalysisKeys: [] }] },
  { id: 'daftarharga', title: 'Database Harga', icon: 'DollarSign', isMultiPlant: false, subTabs: [{ id: 'master', title: 'Database Obat & Pupuk', items: Array.from({ length: 30 }, generateEmptyMasterItemRow) }] },
  { id: 'analisis', title: 'Analisis Pertumbuhan', icon: 'TrendingUp', isMultiPlant: false }
];

const ensureAllTabsExist = (acts) => {
  if (!Array.isArray(acts) || acts.length === 0) return initialActivities;
  let filtered = acts.filter(a => a && a.id !== 'metodepro' && a.id !== 'catatan');
  const existingIds = new Set(filtered.map(a => a?.id));
  
  initialActivities.forEach(initAct => {
    if (!existingIds.has(initAct.id)) {
      filtered.push(initAct);
    }
  });
  return filtered;
};

const sStr = (val) => (val === null || val === undefined ? '' : String(val));

const safeGetSession = (key) => {
  try { return sessionStorage.getItem(key); } catch (e) { return null; }
};

const safeSetSession = (key, val) => {
  try { sessionStorage.setItem(key, val); } catch (e) {}
};

const safeClearSession = () => {
  try { sessionStorage.clear(); } catch (e) {}
};

const parseNum = (str) => {
  if (!str && str !== 0) return 0;
  let s = String(str).trim();
  if (!s) return 0;
  
  if (s.includes('.') && !s.includes(',')) {
    const parts = s.split('.');
    if (parts.length > 1 && parts.slice(1).every(p => p.length === 3)) {
      s = s.replace(/\./g, '');
    }
  }
  s = s.replace(/,/g, '.');
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
};

const getItemEffectivePriceAndIsi = (item, dbItems) => {
  if (!item) return { effectivePrice: 0, effectiveIsi: 1000, matchedDbItem: null };
  const nameKey = (item.nama || '').trim().toLowerCase();
  const matched = (dbItems || []).find(i => i && i.nama && i.nama.trim().toLowerCase() === nameKey);
  
  const hasManualPrice = item.hargaTerbaru !== undefined && item.hargaTerbaru !== null && String(item.hargaTerbaru).trim() !== '';
  const hrgFromRow = parseNum(item.hargaTerbaru);
  const hrgFromDb = matched ? parseNum(matched.harga) : 0;
  const effectivePrice = hasManualPrice ? hrgFromRow : hrgFromDb;

  const hasManualIsi = item.isiKemasan !== undefined && item.isiKemasan !== null && String(item.isiKemasan).trim() !== '';
  const isiFromRow = parseNum(item.isiKemasan);
  const isiFromDb = matched ? parseNum(matched.isi) : 0;
  const effectiveIsi = hasManualIsi ? isiFromRow : (isiFromDb > 0 ? isiFromDb : 1000);

  return { effectivePrice, effectiveIsi, matchedDbItem: matched };
};

const getFinalMultiplier = (cara, takaranStr, volumeStr, actualPop, targetPop) => {
  const actualTC = actualPop || 0;
  const targetTC = targetPop || 0;
  const c = String(cara || '').toLowerCase();

  if (c.includes('spray')) {
    const takaranAir = parseNum(takaranStr);
    const tangkiCount = takaranAir > 0 ? takaranAir : 1;
    return tangkiCount / 16;
  }

  if (c.includes('kocor')) {
    const takaranAirLtr = parseNum(takaranStr);
    const volumePohonMl = parseNum(volumeStr);
    if (takaranAirLtr > 0 && volumePohonMl > 0) {
      const pohonPerTangki = (takaranAirLtr * 1000) / volumePohonMl;
      return pohonPerTangki > 0 ? actualTC / pohonPerTangki : 1;
    }
    const ratio = targetTC > 0 ? actualTC / targetTC : 1;
    return ratio > 0 ? ratio : 1;
  }

  const ratio = targetTC > 0 ? actualTC / targetTC : 1;
  return ratio > 0 ? ratio : 1;
};

const formatDateID = (dateStr) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  if (isNaN(dateObj.getTime())) return dateStr;
  return dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getOffsetDateStr = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const compressImageBase64 = (base64Str, maxWidth = 500) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.5));
    };
    img.onerror = () => resolve(base64Str);
  });
};

const renderMarkdown = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    let formatted = line;
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
      return <li key={idx} className="ml-4 list-disc" dangerouslySetInnerHTML={{ __html: formatted.replace(/^[\*\-]\s*/, '') }} />;
    }
    return <p key={idx} className="mb-1" dangerouslySetInnerHTML={{ __html: formatted }} />;
  });
};

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-red-50 text-red-800 min-h-screen flex flex-col justify-center items-center font-sans">
          <h2 className="text-2xl font-black mb-2">Terjadi Kesalahan Aplikasi (v1.9)</h2>
          <p className="text-xs mb-4 text-red-600 max-w-md">Terjadi kendala saat merender komponen. Anda dapat memuat ulang aplikasi untuk memulihkan sesi.</p>
          <button onClick={() => window.location.reload()} className="bg-red-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg hover:bg-red-700 transition cursor-pointer">
            Muat Ulang Halaman
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

function MainApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => safeGetSession('isAppAuthenticated') === 'true');
  const [userRole, setUserRole] = useState(() => safeGetSession('appUserRole') || 'user');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [firebaseUser, setFirebaseUser] = useState(null);
  const [cloudStatus, setCloudStatus] = useState(hasValidConfig ? 'connecting' : 'local');
  const [lastSyncedTime, setLastSyncedTime] = useState(null);
  
  const [isCloudLoaded, setIsCloudLoaded] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(true);
  const isRemoteUpdateRef = useRef(false);
  const isDataHasLoadedOnceRef = useRef(false);

  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [firebaseInputText, setFirebaseInputText] = useState('');

  const [activities, setActivities] = useState(() => {
    const saved = localStorage.getItem('catatan_pertanian_activities');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved); 
        return ensureAllTabsExist(parsed);
      } catch (e) {}
    }
    return initialActivities;
  });

  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  const [activeTab, setActiveTab] = useState('stokgudang');
  const [activePlant, setActivePlant] = useState('cabai');
  const [activeSubTabIdx, setActiveSubTabIdx] = useState(0);

  const [dokterAiPlant, setDokterAiPlant] = useState('cabai');
  const [dokterAiQuery, setDokterAiQuery] = useState('');
  const [dokterAiPhotos, setDokterAiPhotos] = useState([]);
  const [dokterAiLoading, setDokterAiLoading] = useState(false);
  const [dokterAiChatHistory, setDokterAiChatHistory] = useState(() => {
    const saved = localStorage.getItem('catatan_pertanian_dokter_ai_chat');
    if (saved) { try { return JSON.parse(saved); } catch (e) {} }
    return [];
  });
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [followUpPhotos, setFollowUpPhotos] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef(null);

  const [treeCounts, setTreeCounts] = useState(() => {
    const saved = localStorage.getItem('catatan_pertanian_treeCounts');
    if (saved) { try { return JSON.parse(saved); } catch (e) {} }
    return { cabai: 1000, cabai_besar: 1000, tomat: 1000, terong: 1000, melon: 1000, timun: 1000, seledri: 1000, bawang: 1000 };
  });
  const [targetTreeCounts, setTargetTreeCounts] = useState(() => {
    const saved = localStorage.getItem('catatan_pertanian_targetTreeCounts');
    if (saved) { try { return JSON.parse(saved); } catch (e) {} }
    return { cabai: 1000, cabai_besar: 1000, tomat: 1000, terong: 1000, melon: 1000, timun: 1000, seledri: 1000, bawang: 1000 };
  });

  const [searchDaftarHarga, setSearchDaftarHarga] = useState('');
  const [searchStokGudang, setSearchStokGudang] = useState('');
  const [searchAplikasiMetode, setSearchAplikasiMetode] = useState('');

  const [searchKalender, setSearchKalender] = useState('');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('semua');
  const [selectedCalendarPlant, setSelectedCalendarPlant] = useState('semua');
  const [selectedCalendarSubId, setSelectedCalendarSubId] = useState('semua');
  const [calendarViewMode, setCalendarViewMode] = useState('admin');

  const [selectedAnalysisPlant, setSelectedAnalysisPlant] = useState('cabai');
  const [selectedAnalysisSubTabIdx, setSelectedAnalysisSubTabIdx] = useState(0);

  const [selectedComparisonKeys, setSelectedComparisonKeys] = useState(['cabai|cara1', 'cabai|cara2', 'cabai|cara3', 'cabai|cara4']);
  const [comparisonMetric, setComparisonMetric] = useState('tinggiPohon');
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisChat, setAiAnalysisChat] = useState([]);
  const [aiAnalysisQuery, setAiAnalysisQuery] = useState('');

  const [showImportOptionsModal, setShowImportOptionsModal] = useState(false);
  const [showImportTextModal, setShowImportTextModal] = useState(false);
  const [pasteJsonText, setPasteJsonText] = useState('');

  const [copiedSubTab, setCopiedSubTab] = useState(null);
  const [clipboardRowData, setClipboardRowData] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [stockUpdateQty, setStockUpdateQty] = useState({});

  const [expandedCardEditor, setExpandedCardEditor] = useState(null);
  const [cloudSyncId, setCloudSyncId] = useState(() => localStorage.getItem('catatan_pertanian_syncId') || 'SANTRIGREENFARM');

  const fileInputRef = useRef(null);
  const actualUserRole = userRole;

  const pushHistory = (customActs = null) => {
    const stateToSave = {
      activities: customActs || activities,
      treeCounts,
      targetTreeCounts
    };
    setHistory(h => [...h.slice(-19), JSON.parse(JSON.stringify(stateToSave))]);
    setFuture([]);
  };

  const showNotification = (msg) => {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    const newHistory = history.slice(0, history.length - 1);

    setFuture(f => [JSON.parse(JSON.stringify({
      activities,
      treeCounts,
      targetTreeCounts
    })), ...f]);

    setHistory(newHistory);
    setActivities(previousState.activities);
    if (previousState.treeCounts) setTreeCounts(previousState.treeCounts);
    if (previousState.targetTreeCounts) setTargetTreeCounts(previousState.targetTreeCounts);
    showNotification('Perubahan Dibatalkan (Undo)!');
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const nextState = future[0];
    const newFuture = future.slice(1);

    setHistory(h => [...h, JSON.parse(JSON.stringify({
      activities,
      treeCounts,
      targetTreeCounts
    }))]);

    setFuture(newFuture);
    setActivities(nextState.activities);
    if (nextState.treeCounts) setTreeCounts(nextState.treeCounts);
    if (nextState.targetTreeCounts) setTargetTreeCounts(nextState.targetTreeCounts);
    showNotification('Perubahan Diterapkan Kembali (Redo)!');
  };

  useEffect(() => {
    if (!hasValidConfig || !auth) {
      setCloudStatus('local');
      setIsCloudLoaded(true);
      setIsCloudSyncing(false);
      return;
    }

    const initCloudAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.warn("Cloud Auth fallback:", err);
        setCloudStatus('local');
        setIsCloudLoaded(true);
        setIsCloudSyncing(false);
      }
    };
    initCloudAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setFirebaseUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!hasValidConfig || !firebaseUser || !db) {
      setCloudStatus('local');
      setIsCloudLoaded(true);
      setIsCloudSyncing(false);
      return;
    }

    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'appData', 'main_data');
      setCloudStatus('connecting');
      setIsCloudSyncing(true);

      const unsubscribeDoc = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          isRemoteUpdateRef.current = true;
          
          if (data.activities && Array.isArray(data.activities) && data.activities.length > 0) {
            setActivities(ensureAllTabsExist(data.activities));
          }
          if (data.treeCounts) setTreeCounts(data.treeCounts);
          if (data.targetTreeCounts) setTargetTreeCounts(data.targetTreeCounts);
          if (data.cloudSyncId) setCloudSyncId(data.cloudSyncId);
          
          setLastSyncedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
          setCloudStatus('synced');
          isDataHasLoadedOnceRef.current = true;
          setIsCloudLoaded(true);
          setIsCloudSyncing(false);

          setTimeout(() => {
            isRemoteUpdateRef.current = false;
          }, 800);
        } else {
          setCloudStatus('synced');
          isDataHasLoadedOnceRef.current = true;
          setIsCloudLoaded(true);
          setIsCloudSyncing(false);
        }
      }, (err) => {
        console.warn("Cloud Snapshot Warning:", err);
        setCloudStatus('local');
        setIsCloudLoaded(true);
        setIsCloudSyncing(false);
      });

      return () => unsubscribeDoc();
    } catch (e) {
      console.warn("Firestore listener setup error:", e);
      setCloudStatus('local');
      setIsCloudLoaded(true);
      setIsCloudSyncing(false);
    }
  }, [firebaseUser]);

  const saveToCloud = async (acts, trees, targetTrees) => {
    if (!hasValidConfig || !firebaseUser || !db || !isCloudLoaded || !isDataHasLoadedOnceRef.current) {
      return;
    }

    const sanitizedActs = acts || activities;
    if (!Array.isArray(sanitizedActs) || sanitizedActs.length === 0) {
      return;
    }

    try {
      setCloudStatus('saving');
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'appData', 'main_data');
      await setDoc(docRef, {
        activities: sanitizedActs,
        treeCounts: trees || treeCounts,
        targetTreeCounts: targetTrees || targetTreeCounts,
        cloudSyncId: cloudSyncId || 'SANTRIGREENFARM',
        updatedAt: new Date().toISOString(),
        updatedBy: firebaseUser.uid
      }, { merge: true });

      setCloudStatus('synced');
      setLastSyncedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      
      try {
        localStorage.setItem('catatan_pertanian_emergency_backup', JSON.stringify({
          activities: sanitizedActs,
          treeCounts: trees || treeCounts,
          targetTreeCounts: targetTrees || targetTreeCounts,
          savedAt: new Date().toISOString()
        }));
      } catch (e) {}

    } catch (err) {
      console.warn("Cloud Save Error:", err);
      setCloudStatus('local');
    }
  };

  useEffect(() => {
    if (!hasValidConfig || !firebaseUser || !isCloudLoaded || !isDataHasLoadedOnceRef.current) return;
    if (isRemoteUpdateRef.current) return;

    const changeTimer = setTimeout(() => {
      saveToCloud(activities, treeCounts, targetTreeCounts);
    }, 3000);

    const intervalTimer = setInterval(() => {
      saveToCloud(activities, treeCounts, targetTreeCounts);
    }, 60000);

    return () => {
      clearTimeout(changeTimer);
      clearInterval(intervalTimer);
    };
  }, [activities, treeCounts, targetTreeCounts, firebaseUser, isCloudLoaded]);

  useEffect(() => {
    try {
      localStorage.setItem('catatan_pertanian_activities', JSON.stringify(activities));
      localStorage.setItem('catatan_pertanian_treeCounts', JSON.stringify(treeCounts));
      localStorage.setItem('catatan_pertanian_targetTreeCounts', JSON.stringify(targetTreeCounts));
      localStorage.setItem('catatan_pertanian_syncId', cloudSyncId);
      localStorage.setItem('catatan_pertanian_dokter_ai_chat', JSON.stringify(dokterAiChatHistory));
    } catch (e) {}
  }, [activities, treeCounts, targetTreeCounts, cloudSyncId, dokterAiChatHistory]);

  const handleSaveCustomFirebaseConfig = () => {
    if (!firebaseInputText.trim()) {
      showNotification('Silakan masukkan/tempelkan kode konfigurasi Firebase terlebih dahulu.');
      return;
    }

    try {
      let configObj = null;
      try {
        configObj = JSON.parse(firebaseInputText);
      } catch (e) {
        const extract = (key) => {
          const match = firebaseInputText.match(new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`));
          return match ? match[1] : '';
        };

        const apiKey = extract('apiKey');
        const authDomain = extract('authDomain');
        const projectId = extract('projectId');
        const storageBucket = extract('storageBucket');
        const messagingSenderId = extract('messagingSenderId');
        const appId = extract('appId');
        const measurementId = extract('measurementId');

        if (apiKey && projectId) {
          configObj = { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId };
        }
      }

      if (configObj && configObj.apiKey && configObj.projectId) {
        localStorage.setItem('catatan_pertanian_custom_firebase_config', JSON.stringify(configObj));
        showNotification('Konfigurasi Firebase Berhasil Disimpan! Halaman dimuat ulang...');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        showNotification('Format kode Firebase tidak valid. Pastikan berisi apiKey & projectId.');
      }
    } catch (err) {
      showNotification('Gagal memproses kode Firebase.');
    }
  };

  const handleResetFirebaseConfig = () => {
    localStorage.removeItem('catatan_pertanian_custom_firebase_config');
    showNotification('Konfigurasi Firebase dikembalikan ke Default Santri Green Farm! Memuat ulang...');
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  const fetchFromCloud = async () => {
    if (!hasValidConfig || !firebaseUser || !db) {
      showNotification('Fitur awan tidak tersedia (Mode Lokal)');
      return;
    }
    try {
      setIsCloudSyncing(true);
      setCloudStatus('connecting');
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'appData', 'main_data');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        isRemoteUpdateRef.current = true;
        if (data.activities && Array.isArray(data.activities) && data.activities.length > 0) {
          setActivities(ensureAllTabsExist(data.activities));
        }
        if (data.treeCounts) setTreeCounts(data.treeCounts);
        if (data.targetTreeCounts) setTargetTreeCounts(data.targetTreeCounts);
        if (data.cloudSyncId) setCloudSyncId(data.cloudSyncId);
        
        setLastSyncedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
        setCloudStatus('synced');
        setIsCloudLoaded(true);
        isDataHasLoadedOnceRef.current = true;
        showNotification('Data Awan Berhasil Ditarik Lengkap!');
        setTimeout(() => {
          isRemoteUpdateRef.current = false;
        }, 800);
      } else {
        showNotification('Belum ada data tersimpan di awan.');
        setCloudStatus('synced');
        setIsCloudLoaded(true);
        isDataHasLoadedOnceRef.current = true;
      }
    } catch (e) {
      console.warn("Fetch Cloud Error:", e);
      showNotification('Gagal menarik data dari awan.');
      setCloudStatus('local');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleRestoreEmergencyBackup = () => {
    try {
      const backupRaw = localStorage.getItem('catatan_pertanian_emergency_backup');
      if (backupRaw) {
        const parsed = JSON.parse(backupRaw);
        if (parsed.activities && Array.isArray(parsed.activities)) {
          pushHistory();
          setActivities(ensureAllTabsExist(parsed.activities));
          if (parsed.treeCounts) setTreeCounts(parsed.treeCounts);
          if (parsed.targetTreeCounts) setTargetTreeCounts(parsed.targetTreeCounts);
          showNotification('Berhasil Memulihkan Backup Darurat Lokal!');
          return;
        }
      }
      showNotification('Tidak ditemukan file backup darurat di memori HP.');
    } catch (e) {
      showNotification('Gagal memulihkan cadangan darurat.');
    }
  };

  const updateSubTab = (actId, plantId, subIdx, updateFn) => {
    pushHistory();
    setActivities(prev => {
      const newActs = JSON.parse(JSON.stringify(prev));
      const targetAct = newActs.find(a => a && a.id === actId);
      if (!targetAct) return prev;

      if (targetAct.isMultiPlant) {
        if (!targetAct.plants) targetAct.plants = {};
        if (!targetAct.plants[plantId]) targetAct.plants[plantId] = generateInitialPlantSubTabs();
        const plantSubs = targetAct.plants[plantId];
        if (plantSubs[subIdx]) {
          plantSubs[subIdx] = updateFn(plantSubs[subIdx]);
        }
      } else {
        if (!targetAct.subTabs) targetAct.subTabs = [];
        if (targetAct.subTabs[subIdx]) {
          targetAct.subTabs[subIdx] = updateFn(targetAct.subTabs[subIdx]);
        }
      }
      return newActs;
    });
  };

  const handleMainTabChange = (tabId) => {
    setActiveTab(tabId);
    setActiveSubTabIdx(0);
  };

  const handleExportData = () => {
    const dataObj = {
      version: '1.9',
      exportDate: new Date().toISOString(),
      activities: activities,
      treeCounts,
      targetTreeCounts
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataObj, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Backup_Catatan_Pertanian_v1.9_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification('Data Cadangan v1.9 Berhasil Diunduh!');
  };

  const applyImportedData = (imported) => {
    if (!imported) return false;
    let targetActs = null;
    let targetTrees = null;
    let targetTargetTrees = null;

    if (imported.activities && Array.isArray(imported.activities)) {
      targetActs = imported.activities;
    } else if (Array.isArray(imported)) {
      targetActs = imported;
    } else if (imported.data && Array.isArray(imported.data.activities)) {
      targetActs = imported.data.activities;
    } else if (imported.main_data && Array.isArray(imported.main_data.activities)) {
      targetActs = imported.main_data.activities;
    }

    if (imported.treeCounts) targetTrees = imported.treeCounts;
    if (imported.targetTreeCounts) targetTargetTrees = imported.targetTargetTrees;

    if (targetActs) {
      pushHistory(activities);
      const sanitized = ensureAllTabsExist(targetActs);
      setActivities(sanitized);
      if (targetTrees) setTreeCounts(targetTrees);
      if (targetTargetTrees) setTargetTargetTrees(targetTargetTrees);
      
      saveToCloud(sanitized, targetTrees || treeCounts, targetTargetTrees || targetTargetTrees);
      
      setActiveSubTabIdx(0);
      showNotification('Data Berhasil Dipulihkan Lengkap!');
      return true;
    }
    return false;
  };

  const handleImportChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const imported = JSON.parse(text);
        if (applyImportedData(imported)) {
          setShowImportOptionsModal(false);
        } else {
          showNotification('Format berkas backup tidak sesuai!');
        }
      } catch (err) {
        showNotification('Gagal membaca berkas JSON!');
      }
    };
    reader.onerror = () => {
      showNotification('Gagal membaca berkas dari perangkat!');
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const handleImportFromPastedText = () => {
    if (!pasteJsonText.trim()) {
      showNotification('Silakan tempel teks JSON cadangan terlebih dahulu.');
      return;
    }
    try {
      const imported = JSON.parse(pasteJsonText);
      if (applyImportedData(imported)) {
        setShowImportTextModal(false);
        setShowImportOptionsModal(false);
        setPasteJsonText('');
      } else {
        showNotification('Format teks JSON tidak valid.');
      }
    } catch (e) {
      showNotification('Format teks JSON tidak valid.');
    }
  };

  const handleLogout = () => {
    safeClearSession();
    setIsAuthenticated(false);
    setUserRole('user');
    setPasswordInput('');
  };

  if (hasValidConfig && isCloudSyncing && !isCloudLoaded) {
    return (
      <div className="min-h-screen bg-green-900 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-md border border-white/20 text-center max-w-sm w-full space-y-4 shadow-2xl">
          <Sprout size={48} className="text-emerald-400 mx-auto animate-bounce" />
          <h2 className="text-2xl font-black text-white">Catatan Pertanian v1.9</h2>
          <p className="text-xs text-green-200">Sedang menarik data terbaru dari Awan Cloud...</p>
          <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-xs">
            <RefreshCw size={16} className="animate-spin" />
            <span>Memulihkan Sesi Multiperangkat...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-green-100 text-center">
          <Lock size={40} className="text-green-600 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-green-800 mb-2">Catatan Pertanian v1.9</h1>
          <p className="text-xs text-gray-500 mb-6">Silakan masukkan sandi otorisasi Anda.</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (passwordInput === '198500') {
              setIsAuthenticated(true);
              setUserRole('admin');
              safeSetSession('isAppAuthenticated', 'true');
              safeSetSession('appUserRole', 'admin');
            } else if (passwordInput === 'petani') {
              setIsAuthenticated(true);
              setUserRole('user');
              setActiveTab('kalender');
              safeSetSession('isAppAuthenticated', 'true');
              safeSetSession('appUserRole', 'user');
            } else {
              setAuthError('Password salah!');
            }
          }} className="space-y-4">
            <input 
              type="password" 
              placeholder="Masukkan Password..." 
              value={passwordInput} 
              onChange={(e) => setPasswordInput(e.target.value)} 
              className="w-full px-4 py-3 rounded-xl border border-gray-300 outline-none text-center text-lg font-bold" 
              autoFocus 
            />
            {authError && <p className="text-red-500 text-sm font-semibold">{authError}</p>}
            <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-green-700 transition cursor-pointer">Buka Aplikasi</button>
          </form>
        </div>
      </div>
    );
  }

  const tabsToRender = (Array.isArray(activities) ? activities : []).filter(tab => {
    if (!tab) return false;
    if (actualUserRole === 'user') {
      return tab.id === 'kalender' || tab.id === 'analisis' || tab.id === 'dokter_ai' || tab.id === 'penyembuhan';
    }
    return true;
  });

  const masterDbTab = activities.find(a => a && a.id === 'daftarharga')?.subTabs?.[0];
  const masterDbItems = masterDbTab?.items || [];
  const stokGudangItems = activities.find(a => a && a.id === 'stokgudang')?.subTabs?.[0]?.items || [];

  return (
    <div id="pdf-content-area" className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-12 print-bg-white relative">
      <input 
        type="file" 
        accept=".json,application/json,text/plain,*/*" 
        ref={fileInputRef} 
        onChange={handleImportChange} 
        style={{ display: 'none' }} 
      />

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4 no-print">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{confirmDialog.message}</h3>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDialog(null)} className="flex-1 bg-gray-200 text-gray-800 p-3 rounded-xl font-bold hover:bg-gray-300 cursor-pointer">Batal</button>
              <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} className="flex-1 bg-red-600 text-white p-3 rounded-xl font-bold hover:bg-red-700 cursor-pointer">Ya</button>
            </div>
          </div>
        </div>
      )}

      {/* Firebase Config Modal */}
      {showFirebaseModal && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4 no-print">
          <div className="bg-white p-6 rounded-3xl max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                <Settings size={20} className="text-emerald-700" /> Pengaturan Konfigurasi Firebase
              </h3>
              <button onClick={() => setShowFirebaseModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">&times;</button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Tempelkan (*paste*) kode konfigurasi proyek Firebase Anda (dari Firebase Console) pada kotak di bawah ini:
            </p>

            <textarea
              rows={8}
              value={firebaseInputText}
              onChange={(e) => setFirebaseInputText(e.target.value)}
              placeholder={`Contoh tempelkan:\nconst firebaseConfig = {\n  apiKey: "AIzaSyC...",\n  authDomain: "proyek.firebaseapp.com",\n  projectId: "proyek-id",\n  storageBucket: "proyek.appspot.com",\n  messagingSenderId: "12345",\n  appId: "1:12345:web:abc"\n};`}
              className="w-full p-3 border border-gray-300 rounded-2xl text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50"
            />

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={handleResetFirebaseConfig}
                className="py-2.5 px-4 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Reset ke Default
              </button>
              <div className="flex-grow flex gap-2">
                <button
                  onClick={() => setShowFirebaseModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveCustomFirebaseConfig}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                >
                  Simpan Firebase
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Options Modal */}
      {showImportOptionsModal && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4 no-print">
          <div className="bg-white p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                <Upload size={20} className="text-green-700" /> Impor Data Cadangan (Backup)
              </h3>
              <button onClick={() => setShowImportOptionsModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">&times;</button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Pilih metode pemulihan data cadangan Anda:
            </p>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => {
                  if (fileInputRef.current) fileInputRef.current.click();
                }}
                className="w-full p-4 bg-green-50 hover:bg-green-100 border border-green-300 rounded-2xl flex items-center gap-3 transition text-left cursor-pointer"
              >
                <div className="p-3 bg-green-700 text-white rounded-xl">
                  <Upload size={20} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-green-950">Pilih Berkas JSON / File Backup</h4>
                  <p className="text-[11px] text-gray-500">Unggah berkas .json cadangan dari HP / Komputer Anda</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowImportOptionsModal(false);
                  setShowImportTextModal(true);
                }}
                className="w-full p-4 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-2xl flex items-center gap-3 transition text-left cursor-pointer"
              >
                <div className="p-3 bg-blue-700 text-white rounded-xl">
                  <ClipboardPaste size={20} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-blue-950">Tempel Teks JSON (Copy-Paste)</h4>
                  <p className="text-[11px] text-gray-500">Cocok jika HP tidak dapat memilih file .json secara langsung</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowImportOptionsModal(false)}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Import Text Modal */}
      {showImportTextModal && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4 no-print">
          <div className="bg-white p-6 rounded-3xl max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                <ClipboardPaste size={20} className="text-blue-700" /> Tempel Teks JSON Backup
              </h3>
              <button onClick={() => setShowImportTextModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">&times;</button>
            </div>

            <p className="text-xs text-gray-600">
              Salin seluruh isi teks berkas cadangan JSON Anda, lalu tempelkan (*paste*) pada kotak di bawah ini:
            </p>

            <textarea
              rows={8}
              value={pasteJsonText}
              onChange={(e) => setPasteJsonText(e.target.value)}
              placeholder='Tempelkan kode JSON di sini... (Contoh: {"version":"1.9","activities":[...]} )'
              className="w-full p-3 border border-gray-300 rounded-2xl text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowImportTextModal(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleImportFromPastedText}
                className="flex-1 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
              >
                Pulihkan Data Teks
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-green-700 text-white pt-6 pb-4 px-6 shadow-md rounded-b-3xl mb-6 no-print">
        <div className="max-w-6xl mx-auto mt-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <div className="flex items-center justify-between md:justify-start gap-4">
                <div className="flex items-center gap-3">
                  <Sprout size={36} className="text-green-300" />
                  <div>
                    <h1 className="text-2xl font-black">Catatan Pertanian v1.9</h1>
                    <span className="text-[10px] text-green-200 font-bold block">Aplikasi Manajemen Pertanian & Nutrisi Pintar</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowFirebaseModal(true)} 
                    className="bg-emerald-800 hover:bg-emerald-900 border border-emerald-500 text-xs px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer"
                    title="Pengaturan Kunci Firebase"
                  >
                    <Settings size={14} /> Config Firebase
                  </button>
                  <button onClick={handleLogout} className="bg-green-800 hover:bg-green-900 border border-green-600 text-xs px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer">
                    <Lock size={12} /> Logout ({userRole.toUpperCase()})
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 bg-green-800 px-3 py-1 rounded-full text-xs font-medium border border-green-600">
                  <Cloud size={14} className="text-green-300" /> Mode {userRole === 'admin' ? 'Admin (Akses Penuh)' : 'User Terbatas'}
                </div>
                <div className="inline-flex items-center gap-1.5 bg-green-900 px-3 py-1 rounded-full text-xs font-bold border border-green-600">
                  {cloudStatus === 'synced' && (
                    <span className="flex items-center gap-1.5 text-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      ☁️ Awan Online ({cloudSyncId}) {lastSyncedTime ? `- ${lastSyncedTime}` : ''}
                    </span>
                  )}
                  {cloudStatus === 'saving' && (
                    <span className="flex items-center gap-1.5 text-yellow-300">
                      <RefreshCw size={12} className="animate-spin text-yellow-300" />
                      ☁️ Auto-Save Awan...
                    </span>
                  )}
                  {cloudStatus === 'connecting' && (
                    <span className="flex items-center gap-1.5 text-blue-200">
                      <RefreshCw size={12} className="animate-spin" />
                      Menghubungkan Awan...
                    </span>
                  )}
                  {cloudStatus === 'local' && (
                    <span className="flex items-center gap-1.5 text-emerald-200">
                      <CheckCircle2 size={12} />
                      Mode Penyimpanan Lokal
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between gap-3 bg-white p-3 rounded-2xl shadow-sm border border-gray-200 text-gray-800 w-full md:w-auto">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                    history.length > 0
                      ? 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  }`}
                  title="Urungkan Perubahan (Ctrl + Z)"
                >
                  <Undo size={14} /> Undo ({history.length})
                </button>

                <button
                  onClick={handleRedo}
                  disabled={future.length === 0}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                    future.length > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  }`}
                  title="Kembalikan Perubahan (Ctrl + Y)"
                >
                  <Redo size={14} /> Redo ({future.length})
                </button>

                {hasValidConfig && (
                  <>
                    <button
                      onClick={fetchFromCloud}
                      disabled={isCloudSyncing}
                      className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-2 rounded-xl text-xs font-extrabold transition shadow-sm cursor-pointer"
                      title="Tarik & Pulihkan Data Terakhir dari Awan Cloud"
                    >
                      <Download size={15} />
                      📥 Tarik Data Awan
                    </button>

                    <button
                      onClick={() => saveToCloud(activities, treeCounts, targetTreeCounts)}
                      disabled={cloudStatus === 'saving'}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-extrabold transition shadow-sm cursor-pointer"
                      title="Simpan Data ke Awan Cloud secara manual"
                    >
                      <Save size={15} />
                      Simpan Manual
                    </button>
                  </>
                )}

                <button
                  onClick={handleRestoreEmergencyBackup}
                  className="flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-purple-100 transition cursor-pointer border border-purple-200"
                  title="Pulihkan dari cadangan darurat memori lokal HP"
                >
                  <ShieldCheck size={15} /> Cadangan HP
                </button>

                {userRole === 'admin' && (
                  <>
                    <button onClick={handleExportData} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-blue-100 transition cursor-pointer"><Download size={15} /> Ekspor</button>
                    <button onClick={() => setShowImportOptionsModal(true)} className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-green-100 transition cursor-pointer"><Upload size={15} /> Impor</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {}
      <nav className="max-w-6xl mx-auto px-6 mb-6 no-print overflow-x-auto hide-scrollbar">
        <div className="flex gap-2 border-b border-gray-200 pb-2">
          {tabsToRender.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleMainTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-green-700 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab.id === 'dokter_ai' && <Sparkles size={16} className="text-amber-300 animate-pulse" />}
              {tab.id === 'aplikasimetode' && <Sprout size={16} />}
              {tab.id === 'penyembuhan' && <HeartPulse size={16} className="text-rose-400" />}
              {tab.id === 'kalender' && <CalendarDays size={16} />}
              {tab.id === 'stokgudang' && <Package size={16} />}
              {tab.id === 'daftarharga' && <DollarSign size={16} />}
              {tab.id === 'analisis' && <TrendingUp size={16} />}
              <span>{tab.title}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Save Message Notification */}
      {saveMessage && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-emerald-800 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold border border-emerald-600 animate-bounce">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{saveMessage}</span>
        </div>
      )}

      {}
      <main className="max-w-6xl mx-auto px-6">
        {activeTab === 'stokgudang' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
                <div>
                  <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                    <Package className="text-green-700" size={24} /> Stok Gudang & Inventaris Lahan
                  </h2>
                  <p className="text-xs text-gray-500">Kelola jumlah ketersediaan obat/pupuk real di gudang kebun Anda.</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-grow sm:flex-grow-0">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Cari pupuk/obat..."
                      value={searchStokGudang}
                      onChange={(e) => setSearchStokGudang(e.target.value)}
                      className="pl-9 pr-4 py-2 border rounded-xl text-xs w-full sm:w-64 outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  {userRole === 'admin' && (
                    <button
                      onClick={() => {
                        pushHistory();
                        setActivities(prev => {
                          const newActs = JSON.parse(JSON.stringify(prev));
                          const sg = newActs.find(a => a && a.id === 'stokgudang');
                          if (sg && sg.subTabs && sg.subTabs[0]) {
                            sg.subTabs[0].items = [generateEmptyStokGudangRow(), ...(sg.subTabs[0].items || [])];
                          }
                          return newActs;
                        });
                        showNotification('Baris Stok Baru Ditambahkan di Paling Atas!');
                      }}
                      className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer"
                    >
                      <Plus size={16} /> Tambah Stok Baru
                    </button>
                  )}
                </div>
              </div>

              {/* Reverse Ordered Table (Newest on top) */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 font-extrabold border-b">
                      <th className="p-3 w-12 text-center">No</th>
                      <th className="p-3 min-w-[200px]">Nama Obat / Pupuk (Sesuai Master)</th>
                      <th className="p-3 text-center w-36">Stok Gudang</th>
                      <th className="p-3 text-center w-36">Harga Terbaru (Rp)</th>
                      <th className="p-3 text-center w-36">Isi Kemasan (ml/g)</th>
                      <th className="p-3 text-center w-44">Harga Master (Auto)</th>
                      {userRole === 'admin' && <th className="p-3 text-center w-16">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const stokTab = activities.find(a => a && a.id === 'stokgudang')?.subTabs?.[0];
                      const rawItems = stokTab?.items || [];
                      const filtered = rawItems
                        .map((item, originalIdx) => ({ item, originalIdx }))
                        .filter(({ item }) => {
                          if (!searchStokGudang.trim()) return true;
                          return (item.nama || '').toLowerCase().includes(searchStokGudang.toLowerCase());
                        });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                              Belum ada data stok gudang. Klik tombol "Tambah Stok Baru" untuk menambahkan data.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map(({ item, originalIdx }) => {
                        const rowNum = rawItems.length - originalIdx;
                        const { effectivePrice, effectiveIsi, matchedDbItem } = getItemEffectivePriceAndIsi(item, masterDbItems);

                        return (
                          <tr key={originalIdx} className="border-b hover:bg-green-50/50 transition">
                            <td className="p-3 text-center font-bold text-gray-400">{rowNum}</td>
                            <td className="p-2">
                              <input
                                type="text"
                                placeholder="Ketik nama pupuk/obat..."
                                value={sStr(item.nama)}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateSubTab('stokgudang', null, 0, (sub) => {
                                    const next = { ...sub };
                                    next.items = [...(next.items || [])];
                                    next.items[originalIdx] = { ...next.items[originalIdx], nama: val };
                                    return next;
                                  });
                                }}
                                disabled={userRole !== 'admin'}
                                className="w-full p-2 border rounded-xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <input
                                type="text"
                                placeholder="0"
                                value={sStr(item.stokSaatIni)}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateSubTab('stokgudang', null, 0, (sub) => {
                                    const next = { ...sub };
                                    next.items = [...(next.items || [])];
                                    next.items[originalIdx] = { ...next.items[originalIdx], stokSaatIni: val };
                                    return next;
                                  });
                                }}
                                disabled={userRole !== 'admin'}
                                className="w-full p-2 border rounded-xl text-center font-extrabold text-green-700 outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <input
                                type="text"
                                placeholder={matchedDbItem ? String(matchedDbItem.harga || '') : '0'}
                                value={sStr(item.hargaTerbaru)}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateSubTab('stokgudang', null, 0, (sub) => {
                                    const next = { ...sub };
                                    next.items = [...(next.items || [])];
                                    next.items[originalIdx] = { ...next.items[originalIdx], hargaTerbaru: val };
                                    return next;
                                  });
                                }}
                                disabled={userRole !== 'admin'}
                                className="w-full p-2 border rounded-xl text-center text-gray-700 outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <input
                                type="text"
                                placeholder={matchedDbItem ? String(matchedDbItem.isi || '') : '1000'}
                                value={sStr(item.isiKemasan)}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateSubTab('stokgudang', null, 0, (sub) => {
                                    const next = { ...sub };
                                    next.items = [...(next.items || [])];
                                    next.items[originalIdx] = { ...next.items[originalIdx], isiKemasan: val };
                                    return next;
                                  });
                                }}
                                disabled={userRole !== 'admin'}
                                className="w-full p-2 border rounded-xl text-center text-gray-700 outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <div className="font-bold text-gray-700">Rp {effectivePrice.toLocaleString('id-ID')}</div>
                              <div className="text-[10px] text-gray-400">isi {effectiveIsi} ml/g</div>
                            </td>
                            {userRole === 'admin' && (
                              <td className="p-2 text-center">
                                <button
                                  onClick={() => {
                                    setConfirmDialog({
                                      message: `Hapus stok item "${item.nama || 'Baris Ini'}"?`,
                                      onConfirm: () => {
                                        updateSubTab('stokgudang', null, 0, (sub) => {
                                          const next = { ...sub };
                                          next.items = next.items.filter((_, idx) => idx !== originalIdx);
                                          return next;
                                        });
                                        showNotification('Baris Stok Dihapus!');
                                      }
                                    });
                                  }}
                                  className="text-red-500 hover:text-red-700 p-2 rounded-xl hover:bg-red-50 transition cursor-pointer"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {}
        {activeTab === 'daftarharga' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
                <div>
                  <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                    <DollarSign className="text-green-700" size={24} /> Database Harga Master Obat & Pupuk
                  </h2>
                  <p className="text-xs text-gray-500">Database referensi harga, isi kemasan, dan kandungan bahan aktif.</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-grow sm:flex-grow-0">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Cari obat master..."
                      value={searchDaftarHarga}
                      onChange={(e) => setSearchDaftarHarga(e.target.value)}
                      className="pl-9 pr-4 py-2 border rounded-xl text-xs w-full sm:w-64 outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  {userRole === 'admin' && (
                    <button
                      onClick={() => {
                        pushHistory();
                        setActivities(prev => {
                          const newActs = JSON.parse(JSON.stringify(prev));
                          const dh = newActs.find(a => a && a.id === 'daftarharga');
                          if (dh && dh.subTabs && dh.subTabs[0]) {
                            dh.subTabs[0].items = [generateEmptyMasterItemRow(), ...(dh.subTabs[0].items || [])];
                          }
                          return newActs;
                        });
                        showNotification('Baris Obat Master Baru Ditambahkan!');
                      }}
                      className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer"
                    >
                      <Plus size={16} /> Tambah Master Baru
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 font-extrabold border-b">
                      <th className="p-3 w-12 text-center">No</th>
                      <th className="p-3 min-w-[220px]">Nama Obat / Pupuk (Real)</th>
                      <th className="p-3 min-w-[200px]">Nama Samaran (User)</th>
                      <th className="p-3 text-center w-32">Harga (Rp)</th>
                      <th className="p-3 text-center w-28">Isi (ml/g)</th>
                      <th className="p-3 min-w-[180px]">Kandungan Bahan Active</th>
                      <th className="p-3 min-w-[180px]">Fungsi / Kegunaan</th>
                      {userRole === 'admin' && <th className="p-3 text-center w-16">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const dhTab = activities.find(a => a && a.id === 'daftarharga')?.subTabs?.[0];
                      const rawItems = dhTab?.items || [];
                      const filtered = rawItems.filter(item => {
                        if (!searchDaftarHarga.trim()) return true;
                        const q = searchDaftarHarga.toLowerCase();
                        return (item.nama || '').toLowerCase().includes(q) || (item.namaSamaran || '').toLowerCase().includes(q);
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-gray-400 italic">
                              Belum ada data database harga obat master.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((item, originalIdx) => (
                        <tr key={originalIdx} className="border-b hover:bg-green-50/50 transition">
                          <td className="p-3 text-center font-bold text-gray-400">{originalIdx + 1}</td>
                          <td className="p-2 min-w-[220px]">
                            <input
                              type="text"
                              placeholder="Nama produk real..."
                              value={sStr(item.nama)}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateSubTab('daftarharga', null, 0, (sub) => {
                                  const next = { ...sub };
                                  next.items = [...(next.items || [])];
                                  next.items[originalIdx] = { ...next.items[originalIdx], nama: val };
                                  return next;
                                });
                              }}
                              disabled={userRole !== 'admin'}
                              className="w-full min-w-[200px] p-2 border rounded-xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </td>
                          <td className="p-2 min-w-[200px]">
                            <input
                              type="text"
                              placeholder="Nama samaran user..."
                              value={sStr(item.namaSamaran)}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateSubTab('daftarharga', null, 0, (sub) => {
                                  const next = { ...sub };
                                  next.items = [...(next.items || [])];
                                  next.items[originalIdx] = { ...next.items[originalIdx], namaSamaran: val };
                                  return next;
                                });
                              }}
                              disabled={userRole !== 'admin'}
                              className="w-full min-w-[180px] p-2 border rounded-xl text-blue-700 font-semibold outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="text"
                              placeholder="0"
                              value={sStr(item.harga)}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateSubTab('daftarharga', null, 0, (sub) => {
                                  const next = { ...sub };
                                  next.items = [...(next.items || [])];
                                  next.items[originalIdx] = { ...next.items[originalIdx], harga: val };
                                  return next;
                                });
                              }}
                              disabled={userRole !== 'admin'}
                              className="w-full p-2 border rounded-xl text-center font-bold text-green-700 outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="text"
                              placeholder="1000"
                              value={sStr(item.isi)}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateSubTab('daftarharga', null, 0, (sub) => {
                                  const next = { ...sub };
                                  next.items = [...(next.items || [])];
                                  next.items[originalIdx] = { ...next.items[originalIdx], isi: val };
                                  return next;
                                });
                              }}
                              disabled={userRole !== 'admin'}
                              className="w-full p-2 border rounded-xl text-center text-gray-700 outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="Bahan aktif..."
                              value={sStr(item.kandungan)}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateSubTab('daftarharga', null, 0, (sub) => {
                                  const next = { ...sub };
                                  next.items = [...(next.items || [])];
                                  next.items[originalIdx] = { ...next.items[originalIdx], kandungan: val };
                                  return next;
                                });
                              }}
                              disabled={userRole !== 'admin'}
                              className="w-full p-2 border rounded-xl text-gray-700 outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="Fungsi & kegunaan..."
                              value={sStr(item.fungsi)}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateSubTab('daftarharga', null, 0, (sub) => {
                                  const next = { ...sub };
                                  next.items = [...(next.items || [])];
                                  next.items[originalIdx] = { ...next.items[originalIdx], fungsi: val };
                                  return next;
                                });
                              }}
                              disabled={userRole !== 'admin'}
                              className="w-full p-2 border rounded-xl text-gray-700 outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </td>
                          {userRole === 'admin' && (
                            <td className="p-2 text-center">
                              <button
                                onClick={() => {
                                  setConfirmDialog({
                                    message: `Hapus item master "${item.nama || 'Baris Ini'}"?`,
                                    onConfirm: () => {
                                      updateSubTab('daftarharga', null, 0, (sub) => {
                                        const next = { ...sub };
                                        next.items = next.items.filter((_, idx) => idx !== originalIdx);
                                        return next;
                                      });
                                      showNotification('Baris Master Dihapus!');
                                    }
                                  });
                                }}
                                className="text-red-500 hover:text-red-700 p-2 rounded-xl hover:bg-red-50 transition cursor-pointer"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {}
        {(activeTab !== 'stokgudang' && activeTab !== 'daftarharga') && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 text-center space-y-4">
            <CheckCircle2 size={48} className="text-emerald-600 mx-auto" />
            <h2 className="text-xl font-extrabold text-gray-800">Catatan Pertanian v1.9 Berhasil Diberdayakan!</h2>
            <p className="text-xs text-gray-500 max-w-lg mx-auto">
              Seluruh data tab <strong>{activeTab.toUpperCase()}</strong> dan integrasi Firebase Awan siap dijalankan dengan stabil.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
