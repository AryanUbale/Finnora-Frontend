import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { ModernNavbar } from '../components/ModernNavbar';
import api from '../lib/api';
import { formatCurrency, formatDate } from '../lib/formatters';
import toast from 'react-hot-toast';
import {
  Upload, Trash2, X, Loader2,
  FileText, CheckCircle, AlertCircle, Receipt as ReceiptIcon
} from 'lucide-react';

interface ReceiptItem {
  id: string; imageUrl: string; rawOcrText?: string;
  extractedAmount?: string; extractedMerchant?: string; extractedDate?: string;
  ocrConfidence?: number; status: string; transactionId?: string;
  transaction?: { id: string; amount: string; note: string; date: string; category: { name: string; icon: string } };
  createdAt: string;
}

export function ReceiptsPage() {
  const { theme } = useTheme();
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrResult, setOcrResult] = useState<{ text: string; amount?: string; merchant?: string; date?: string; confidence: number } | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDarkMode = theme === 'dark';

  const fetchReceipts = async () => {
    setLoading(true);
    try { 
      const res = await api.get('/api/receipts'); 
      setReceipts(res.data.data); 
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { 
    const timer = setTimeout(() => {
      fetchReceipts(); 
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleFileSelect = (file: File) => {
    if (file.size > 5 * 1024 * 1024) { 
      toast.error('File too large (max 5MB)'); 
      return; 
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setOcrResult(null);
    setShowUploadModal(true);
  };

  const runClientOcr = async (file: File) => {
    setOcrProgress(5);
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: (m: { status: string; progress: number }) => { 
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100)); 
          }
        },
      });
      setOcrProgress(15);
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const extracted = extractReceiptData(data.text);
      setOcrResult({ text: data.text, ...extracted, confidence: data.confidence });
      setOcrProgress(100);
      return { text: data.text, ...extracted, confidence: data.confidence };
    } catch (err) {
      console.error('OCR failed:', err);
      setOcrProgress(0);
      return null;
    }
  };

  const extractReceiptData = (text: string) => {
    const amountRegex = /(?:total|amount|grand\s*total|due|payable|rs\.?|inr|₹)\s*:?\s*([₹$]?\s*[\d,]+\.?\d{0,2})/gi;
    const amounts = [...text.matchAll(amountRegex)].map(m => parseFloat(m[1].replace(/[₹$,\s]/g, '')));
    const plainNumbers = [...text.matchAll(/\b(\d{1,3}(?:,\d{3})*(?:\.\d{2}))\b/g)].map(m => parseFloat(m[1].replace(/,/g, '')));
    const allAmounts = [...amounts, ...plainNumbers].filter(a => a > 0 && a < 1000000);
    const amount = allAmounts.length > 0 ? String(Math.max(...allAmounts)) : undefined;

    const datePatterns = [
      /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/,
      /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{2,4})/i,
    ];
    let date: string | undefined;
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) { date = match[0]; break; }
    }

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2 && !/^\d+$/.test(l));
    const knownMerchants: Record<string, string> = { netflix: 'Netflix', swiggy: 'Swiggy', zomato: 'Zomato', amazon: 'Amazon', uber: 'Uber', spotify: 'Spotify', flipkart: 'Flipkart' };
    const textLower = text.toLowerCase();
    let merchant = Object.entries(knownMerchants).find(([k]) => textLower.includes(k))?.[1];
    if (!merchant && lines.length > 0) merchant = lines[0].slice(0, 50);

    return { amount, merchant, date };
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      const res = await api.post('/api/receipts/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const receiptId = res.data.data.id;

      // Run client-side OCR
      const ocr = await runClientOcr(selectedFile);

      // Save OCR findings
      if (ocr) {
        if (ocr.confidence < 70) {
          // Low confidence, run server-side OCR
          await api.post(`/api/receipts/${receiptId}/reprocess`, {
            runServerOcr: true
          });
          toast.success('Uploaded receipt. Server OCR running in background.');
        } else {
          await api.post(`/api/receipts/${receiptId}/reprocess`, {
            rawOcrText: ocr.text,
            extractedAmount: ocr.amount ? parseFloat(ocr.amount) : undefined,
            extractedMerchant: ocr.merchant,
            ocrConfidence: ocr.confidence,
          });
          toast.success('Receipt scanned & data extracted!');
        }
      } else {
        toast.success('Receipt uploaded successfully.');
      }
      fetchReceipts();
    } catch { 
      toast.error('Failed to upload receipt.');
    }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm('Delete this receipt permanently?');
    if (!confirmDelete) return;
    try {
      await api.delete(`/api/receipts/${id}`); 
      toast.success('Receipt deleted.');
      fetchReceipts(); 
    } catch {
      toast.error('Could not delete receipt.');
    }
  };

  const closeModal = () => { 
    setShowUploadModal(false); 
    setSelectedFile(null); 
    setPreviewUrl(''); 
    setOcrResult(null); 
    setOcrProgress(0); 
  };

  const getConfidenceBadge = (c?: number) => {
    if (!c) return null;
    if (c >= 80) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-450 border border-emerald-500/25">High ({c}%)</span>;
    if (c >= 50) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-450 border border-amber-500/25">Medium ({c}%)</span>;
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/25">Low ({c}%)</span>;
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode
        ? 'bg-[#040716] text-white'
        : 'bg-[#fafbfe] text-slate-900'
    }`}>
      <ModernNavbar activeTab="receipts" />

      <main className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className={`text-3xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Receipt Scanner
            </h1>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-550'}`}>
              Upload image receipts to extract information using client OCR
            </p>
          </div>
          <button 
            onClick={() => { setShowUploadModal(true); setOcrResult(null); setOcrProgress(0); }} 
            className="btn-primary flex items-center gap-2 cursor-pointer shadow-lg animate-pulse-glow"
          >
            <Upload size={16}/>
            <span>Upload Receipt</span>
          </button>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-56 rounded-3xl bg-slate-900/40 animate-pulse border border-slate-800/20 shimmer" />
            ))}
          </div>
        ) : receipts.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-800/30 rounded-3xl bg-slate-900/5">
            <ReceiptIcon size={48} className="mx-auto text-slate-500 mb-4 opacity-50"/>
            <p className={`text-base font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-650'}`}>No receipts yet</p>
            <p className="text-xs text-slate-500 mt-1">Upload a shop or utility receipt image to scan it automatically.</p>
            <button 
              onClick={() => { setShowUploadModal(true); setOcrResult(null); setOcrProgress(0); }} 
              className="mt-4 text-xs font-semibold text-indigo-500 hover:text-indigo-600 cursor-pointer"
            >
              Upload receipt image
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 stagger-children">
            {receipts.map((r, i) => (
              <div 
                key={r.id} 
                className={`group rounded-3xl overflow-hidden border transition-all hover:scale-[1.01] ${
                  isDarkMode
                    ? 'border-slate-850 bg-slate-900/25 hover:border-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/5'
                    : 'border-slate-100 bg-white hover:border-indigo-500/10 hover:shadow-sm shadow-indigo-100/50'
                }`}
                style={{ animationDelay: `${i*50}ms` }}
              >
                <div className="h-36 bg-[#040611] flex items-center justify-center overflow-hidden relative">
                  <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex items-center justify-center">
                    <span className="text-white text-xs font-bold bg-slate-950/80 px-3 py-1.5 rounded-xl backdrop-blur">View Image</span>
                  </div>
                  <img 
                    src={`http://localhost:5000${r.imageUrl}`} 
                    alt="Receipt" 
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3.5">
                    <span className={`font-bold text-sm truncate max-w-[140px] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {r.extractedMerchant || 'Unknown Merchant'}
                    </span>
                    {getConfidenceBadge(r.ocrConfidence ? Math.round(r.ocrConfidence) : undefined)}
                  </div>
                  <div className="flex items-center justify-between text-sm mb-4">
                    <span className={`font-extrabold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      {r.extractedAmount ? formatCurrency(Number(r.extractedAmount)) : '—'}
                    </span>
                    <span className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {formatDate(r.createdAt)}
                    </span>
                  </div>
                  <div className={`flex items-center justify-between pt-3.5 border-t ${
                    isDarkMode ? 'border-slate-850' : 'border-slate-100'
                  }`}>
                    {r.transactionId ? (
                      <span className="text-xs text-emerald-450 font-bold flex items-center gap-1.5">
                        <CheckCircle size={13}/>
                        <span>Linked</span>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                        <AlertCircle size={13}/>
                        <span>Not linked</span>
                      </span>
                    )}
                    <button 
                      onClick={() => handleDelete(r.id)} 
                      className={`p-2 rounded-xl transition-all cursor-pointer ${
                        isDarkMode 
                          ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10' 
                          : 'text-slate-400 hover:text-red-650 hover:bg-red-50'
                      }`}
                    >
                      <Trash2 size={15}/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {showUploadModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-4" 
          onClick={closeModal}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl animate-scale-in ${
              isDarkMode
                ? 'bg-[#0f1225] border-slate-800'
                : 'bg-white border-slate-100'
            }`}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Upload Receipt Image
              </h2>
              <button 
                onClick={closeModal} 
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDarkMode ? 'text-slate-400 hover:bg-slate-900 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <X size={18}/>
              </button>
            </div>

            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all hover:border-indigo-500 ${
                  isDarkMode ? 'border-slate-800 bg-slate-900/30' : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <Upload size={36} className="mx-auto text-indigo-400 mb-3 opacity-80"/>
                <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Drop receipt image here</p>
                <p className="text-xs text-slate-500 mt-1.5">Or click to browse (JPEG, PNG, WebP · max 5MB)</p>
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp" 
                  className="hidden" 
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                />
              </div>
            ) : (
              <>
                <div className="rounded-2xl overflow-hidden mb-5 bg-[#050713] border border-slate-800 max-h-48 flex items-center justify-center">
                  <img src={previewUrl} alt="Preview" className="max-h-48 object-contain"/>
                </div>

                {ocrProgress > 0 && ocrProgress < 100 && (
                  <div className="mb-5 text-left animate-fade-in">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                        <Loader2 size={13} className="animate-spin"/>
                        <span>Scanning receipt texts...</span>
                      </span>
                      <span className="text-indigo-400 font-bold">{ocrProgress}%</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${ocrProgress}%` }}/>
                    </div>
                  </div>
                )}

                {ocrResult && (
                  <div className={`mb-5 p-4 rounded-2xl border ${
                    isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <p className={`text-xs font-bold mb-3.5 flex items-center gap-2 ${isDarkMode ? 'text-slate-250' : 'text-slate-850'}`}>
                      <FileText size={14} className="text-indigo-400"/>
                      <span>Extracted Data</span> 
                      <span className="ml-auto">{getConfidenceBadge(Math.round(ocrResult.confidence))}</span>
                    </p>
                    <div className="grid grid-cols-3 gap-3 text-xs leading-normal">
                      <div>
                        <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Amount</span>
                        <p className={`font-black mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {ocrResult.amount ? `₹${ocrResult.amount}` : '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Merchant</span>
                        <p className={`font-black mt-0.5 truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {ocrResult.merchant || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Date</span>
                        <p className={`font-black mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {ocrResult.date || '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button 
                    onClick={() => { setSelectedFile(null); setPreviewUrl(''); setOcrResult(null); }} 
                    className={`flex-1 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isDarkMode ? 'border-slate-800 text-slate-400 hover:bg-slate-900' : 'border-slate-200 text-slate-650 hover:bg-slate-55'
                    }`}
                  >
                    Change Image
                  </button>
                  {!ocrResult ? (
                    <button 
                      onClick={handleUpload} 
                      disabled={uploading} 
                      className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    >
                      {uploading ? (
                        <>
                          <Loader2 size={13} className="animate-spin"/>
                          <span>Uploading</span>
                        </>
                      ) : (
                        <>
                          <Upload size={13}/>
                          <span>Upload & Scan</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button 
                      onClick={closeModal} 
                      className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10"
                    >
                      <CheckCircle size={13}/>
                      <span>Done</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
