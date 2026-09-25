'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Sparkles,
  ArrowRight,
  Loader2,
  Settings,
  Bot,
  User,
  Key,
  X,
  Plus,
  Paperclip,
  Database,
  ShieldCheck,
  Copy,
  Check,
  History,
  MessageSquare,
  Trash2,
  Package,
  Layers,
  FileText,
  ShoppingCart,
  AlertTriangle,
  TrendingDown
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api/api';
import { useGetPermission } from '@/lib/hooks/useGetPermission';

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface MessagePayload {
  role: 'user' | 'assistant';
  content: string;
}

interface AttachedFile {
  name: string;
  size: number;
  type: string;
  content: string;
}

const FormattedMarkdown: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  const parseInlineSegment = (text: string) => {
    const parts: React.ReactNode[] = [];
    let key = 0;
    const regex = /(\*\*(.*?)\*\*|\*(.*?)\*|`(.*?)`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      if (match[2] !== undefined) {
        parts.push(
          <strong key={key++} className="font-bold text-slate-900">
            {match[2]}
          </strong>
        );
      } else if (match[3] !== undefined) {
        parts.push(
          <em key={key++} className="italic text-slate-800">
            {match[3]}
          </em>
        );
      } else if (match[4] !== undefined) {
        parts.push(
          <code
            key={key++}
            className="px-1 py-0.5 bg-slate-200/80 text-emerald-900 font-mono rounded-sm text-[11px]"
          >
            {match[4]}
          </code>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const parseInline = (text: string) => {
    const brRegex = /(<br\s*\/?>)/gi;
    const brParts = text.split(brRegex);
    if (brParts.length > 1) {
      return brParts.map((part, i) => {
        if (/^<br\s*\/?>$/i.test(part)) {
          return <br key={`br-inline-${i}`} />;
        }
        return parseInlineSegment(part);
      });
    }
    return parseInlineSegment(text);
  };

  const isTableLine = (str: string) => {
    const trimmed = str.trim();
    return (
      trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2
    );
  };

  let idx = 0;
  while (idx < lines.length) {
    const line = lines[idx];
    const trimmed = line.trim();

    if (isTableLine(line)) {
      const tableLines: string[] = [];
      while (idx < lines.length && isTableLine(lines[idx])) {
        tableLines.push(lines[idx].trim());
        idx++;
      }

      if (tableLines.length >= 1) {
        const headerLine = tableLines[0];
        const headers = headerLine
          .split('|')
          .slice(1, -1)
          .map((h) => h.trim());

        let startIndex = 1;
        if (
          tableLines.length > 1 &&
          tableLines[1].replace(/[\s\|:\-]/g, '') === ''
        ) {
          startIndex = 2;
        }

        const dataRows = tableLines.slice(startIndex).map((rowLine) =>
          rowLine
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim())
        );

        elements.push(
          <div
            key={`table-${idx}`}
            className="my-3 overflow-x-auto rounded-sm border border-slate-200 shadow-xs bg-white"
          >
            <table className="w-full text-xs text-left border-collapse min-w-[550px]">
              <thead className="bg-slate-100/90 text-slate-900 border-b border-slate-200 font-semibold">
                <tr>
                  {headers.map((headerText, colIdx) => (
                    <th
                      key={colIdx}
                      className="px-3 py-2 border-r border-slate-200/70 last:border-r-0 whitespace-nowrap font-bold text-slate-900 bg-slate-100/90"
                    >
                      {parseInline(headerText)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {dataRows.map((rowCells, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="hover:bg-emerald-50/50 transition-colors odd:bg-slate-50/40"
                  >
                    {rowCells.map((cellText, cellIdx) => (
                      <td
                        key={cellIdx}
                        className="px-3 py-2 border-r border-slate-200/50 last:border-r-0 leading-relaxed font-normal"
                      >
                        {parseInline(cellText)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    if (!trimmed) {
      elements.push(<div key={`br-${idx}`} className="h-1" />);
      idx++;
      continue;
    }

    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      elements.push(<hr key={`hr-${idx}`} className="my-2 border-slate-200" />);
      idx++;
      continue;
    }

    if (trimmed.startsWith('> ')) {
      const quoteContent = trimmed.replace(/^>\s*/, '');
      elements.push(
        <blockquote
          key={`quote-${idx}`}
          className="my-1.5 border-l-2 border-emerald-500 pl-2.5 py-1 text-slate-700 bg-emerald-50/40 rounded-r-sm italic text-[11.5px]"
        >
          {parseInline(quoteContent)}
        </blockquote>
      );
      idx++;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];

      if (level === 1) {
        elements.push(
          <h1
            key={`h1-${idx}`}
            className="font-extrabold text-sm text-slate-900 mt-3 mb-1"
          >
            {parseInline(headingText)}
          </h1>
        );
      } else if (level === 2) {
        elements.push(
          <h2
            key={`h2-${idx}`}
            className="font-bold text-xs text-slate-900 mt-2.5 mb-1 pb-0.5 border-b border-slate-200 flex items-center gap-1.5"
          >
            <span className="w-2 h-2 bg-emerald-600 rounded-sm shrink-0" />
            {parseInline(headingText)}
          </h2>
        );
      } else if (level === 3) {
        elements.push(
          <h3
            key={`h3-${idx}`}
            className="font-bold text-xs text-slate-900 mt-2.5 mb-1 flex items-center gap-1.5 border-b border-slate-200/80 pb-0.5"
          >
            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-sm shrink-0" />
            {parseInline(headingText)}
          </h3>
        );
      } else {
        elements.push(
          <h4
            key={`h4-${idx}`}
            className="font-semibold text-xs text-slate-800 mt-2 mb-1 flex items-center gap-1.5"
          >
            <span className="w-1 h-1 bg-emerald-500 rounded-full shrink-0" />
            {parseInline(headingText)}
          </h4>
        );
      }
      idx++;
      continue;
    }

    if (/^[\*\-]\s+/.test(trimmed)) {
      const listContent = trimmed.replace(/^[\*\-]\s+/, '');
      elements.push(
        <div
          key={`li-${idx}`}
          className="flex items-start gap-2 my-0.5 pl-1 text-slate-700"
        >
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
          <div className="flex-1 leading-relaxed">
            {parseInline(listContent)}
          </div>
        </div>
      );
      idx++;
      continue;
    }

    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div
          key={`num-${idx}`}
          className="flex items-start gap-2 my-0.5 pl-1 text-slate-700"
        >
          <span className="font-bold text-emerald-600 text-[11px] shrink-0 w-4 text-right">
            {numMatch[1]}.
          </span>
          <div className="flex-1 leading-relaxed">
            {parseInline(numMatch[2])}
          </div>
        </div>
      );
      idx++;
      continue;
    }

    elements.push(
      <p key={`p-${idx}`} className="my-0.5 leading-relaxed text-slate-800">
        {parseInline(line)}
      </p>
    );
    idx++;
  }

  return (
    <div className="space-y-1 text-xs text-slate-800 leading-normal">
      {elements}
    </div>
  );
};

interface RTUAIChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  activeContextData?: any;
}

export const RTUAIChatbot: React.FC<RTUAIChatbotProps> = ({
  isOpen,
  onClose,
  activeContextData
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(
    'gemini-3.5-flash-lite'
  );
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check RTU Module permissions for current user
  const { hasPermission: hasVendor } = useGetPermission('get', 'rtu_vendor');
  const { hasPermission: hasMaterial } = useGetPermission(
    'get',
    'rtu_material'
  );
  const { hasPermission: hasProduct } = useGetPermission('get', 'rtu_product');
  const { hasPermission: hasRecipe } = useGetPermission('get', 'rtu_recipe');
  const { hasPermission: hasGRN } = useGetPermission('get', 'rtu_grn');
  const { hasPermission: hasProduction } = useGetPermission(
    'get',
    'rtu_production'
  );
  const { hasPermission: hasDistribution } = useGetPermission(
    'get',
    'rtu_distribution'
  );
  const { hasPermission: hasPurchase } = useGetPermission(
    'get',
    'rtu_purchase'
  );
  const { hasPermission: hasInvoice } = useGetPermission('get', 'rtu_invoice');
  const { hasPermission: hasPayment } = useGetPermission('get', 'rtu_payment');
  const { hasPermission: hasReport } = useGetPermission('get', 'rtu_report');

  const allowedModulesList = [
    hasVendor && 'Vendor',
    hasMaterial && 'Material Stok',
    hasRecipe && 'Resep & Formula',
    hasProduct && 'Produk Master',
    hasGRN && 'Goods Receipt Note',
    hasProduction && 'Produksi & HPP',
    hasDistribution && 'Distribusi',
    hasPurchase && 'Purchase Order',
    hasInvoice && 'Invoice Reconcile',
    hasPayment && 'Payment',
    hasReport && 'Laporan Analytics'
  ].filter(Boolean) as string[];

  const loadSessionMessages = useCallback(async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setIsLoading(true);
    try {
      const res = await api.get(`/ai/sessions/${sessionId}/messages`);
      if (res.data.success) {
        const rawMsgs = res.data.messages || [];
        const formatted: Message[] = rawMsgs.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })
        }));
        setMessages(formatted);
      }
    } catch {
      toast.error('Gagal memuat pesan percakapan.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSessions = useCallback(
    async (autoSelectFirst: boolean = false) => {
      setIsLoadingSessions(true);
      try {
        const res = await api.get('/ai/sessions');
        if (res.data.success) {
          const fetchedList: ChatSession[] = res.data.sessions || [];
          setSessions(fetchedList);
          if (autoSelectFirst && fetchedList.length > 0) {
            loadSessionMessages(fetchedList[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to fetch AI chat sessions:', e);
      } finally {
        setIsLoadingSessions(false);
      }
    },
    [loadSessionMessages]
  );

  const handleNewChat = () => {
    if (messages.length === 0) return;
    setActiveSessionId(null);
    setMessages([]);
    setAttachedFile(null);
    toast.info('Percakapan baru siap dimulai.');
  };

  const handleDeleteSession = async (
    sessionId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    try {
      await api.delete(`/ai/sessions/${sessionId}`);
      toast.success('Sesi percakapan berhasil dihapus.');
      if (activeSessionId === sessionId) {
        handleNewChat();
      }
      fetchSessions();
    } catch {
      toast.error('Gagal menghapus sesi percakapan.');
    }
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedMsgId(msgId);
      toast.success('Jawaban AI berhasil disalin!');
      setTimeout(() => setCopiedMsgId(null), 2000);
    }
  };

  const getModelLabel = (model: string) => {
    switch (model) {
      case 'gemini-3.5-flash-lite':
        return 'Gemini 3.5 Flash Lite';
      case 'gemini-3.1-flash-lite':
        return 'Gemini 3.1 Flash Lite';
      case 'gemini-2.5-flash':
        return 'Gemini 2.5 Flash';
      case 'gemini-3.5-flash':
        return 'Gemini 3.5 Flash';
      case 'gemini-3.7-flash':
        return 'Gemini 3.7 Flash';
      case 'gemini-3-flash':
        return 'Gemini 3 Flash';
      case 'gemini-1.5-flash':
        return 'Gemini 1.5 Flash';
      case 'auto':
        return 'Auto Discovery';
      default:
        return model.replace('gemini-', 'Gemini ').replace('models/', '');
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSessions(true);
      api
        .get('/ai/settings')
        .then((res) => {
          if (res.data.success) {
            if (res.data.customApiKey !== undefined) {
              setCustomApiKey(res.data.customApiKey);
            }
            if (res.data.selectedModel) {
              setSelectedModel(res.data.selectedModel);
            }
          }
        })
        .catch(() => {
          if (typeof window !== 'undefined') {
            const savedKey = localStorage.getItem('gemini_api_key') || '';
            const savedModel =
              localStorage.getItem('gemini_model') || 'gemini-3.5-flash-lite';
            setCustomApiKey(savedKey);
            setSelectedModel(savedModel);
          }
        });
    }
  }, [isOpen, fetchSessions]);

  const handleSaveSettings = async () => {
    try {
      const res = await api.post('/ai/settings', {
        customApiKey: customApiKey.trim(),
        selectedModel
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('gemini_api_key', customApiKey.trim());
        localStorage.setItem('gemini_model', selectedModel);
      }
      toast.success(
        res.data.message ||
          'Pengaturan AI berhasil disimpan di database akun Anda.'
      );
      setShowSettings(false);
    } catch {
      toast.error('Gagal menyimpan pengaturan ke database.');
    }
  };

  const handleModelChange = async (newModel: string) => {
    setSelectedModel(newModel);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gemini_model', newModel);
    }
    try {
      await api.post('/ai/settings', {
        customApiKey: customApiKey.trim(),
        selectedModel: newModel
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      setAttachedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        content: text
      });
      toast.success(`File "${file.name}" berhasil dilampirkan.`);
    };

    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }

    e.target.value = '';
  };

  const handleSendMessage = async (textToSend?: string) => {
    const rawQuery = (textToSend || input).trim();
    if ((!rawQuery && !attachedFile) || isLoading) return;

    let displayQuery = rawQuery;
    let fullPayloadContent = rawQuery;

    if (attachedFile) {
      const fileHeader = `📄 [File Lampiran: ${attachedFile.name}]`;
      displayQuery = rawQuery ? `${rawQuery}\n\n${fileHeader}` : fileHeader;
      fullPayloadContent = rawQuery
        ? `${rawQuery}\n\n[Lampiran File Data Operasional: ${attachedFile.name}]\n\`\`\`\n${attachedFile.content.slice(0, 12000)}\n\`\`\``
        : `[Lampiran File Data Operasional: ${attachedFile.name}]\n\`\`\`\n${attachedFile.content.slice(0, 12000)}\n\`\`\``;
    }

    const userMsgDisplay: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: displayQuery,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    const userMsgPayload: MessagePayload = {
      role: 'user',
      content: fullPayloadContent
    };

    setMessages((prev) => [...prev, userMsgDisplay]);
    if (!textToSend) setInput('');
    setAttachedFile(null);
    setIsLoading(true);

    try {
      const previousMsgsPayload = messages.slice(-8).map((m) => ({
        role: m.role,
        content:
          m.content.length > 2500
            ? m.content.slice(0, 2500) + '\n... [Diposting secara efisien]'
            : m.content
      }));

      const res = await api.post('/ai/chat', {
        sessionId: activeSessionId || undefined,
        messages: [...previousMsgsPayload, userMsgPayload],
        rtuContext: {
          activeContextData
        },
        customApiKey: customApiKey || undefined,
        selectedModel: selectedModel
      });

      const data = res.data;
      if (data.sessionId) {
        setActiveSessionId(data.sessionId);
        fetchSessions();
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'Tidak ada respon yang diterima.',
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Gagal menghubungi Gemini AI.');
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ **Terjadi Kesalahan**: ${error.message || 'Silakan periksa API Key atau koneksi internet Anda.'}`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetClick = (presetText: string) => {
    handleSendMessage(presetText);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-[1100px] h-[90vh] flex flex-col p-0 gap-0 rounded-sm overflow-hidden bg-slate-50 border-slate-200">
        {/* Header */}
        <DialogHeader className="p-4 bg-slate-900 text-white flex-row items-center justify-between space-y-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-sm border border-emerald-500/30">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                AI RTU Analyst Sinar Utama
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-sm">
                  {getModelLabel(selectedModel)}
                </span>
              </DialogTitle>
              <div className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
                <span>Asisten Operasional & Supply Chain RTU</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title="Riwayat Percakapan AI"
              className={`px-2.5 py-1 text-xs rounded-sm border transition-all flex items-center gap-1.5 cursor-pointer ${
                isSidebarOpen
                  ? 'bg-emerald-600 border-emerald-500 text-white font-semibold shadow-sm'
                  : 'bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>Riwayat Chat</span>
              {sessions.length > 0 && (
                <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.2 rounded-sm font-bold">
                  {sessions.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={handleNewChat}
              disabled={messages.length === 0}
              title={
                messages.length === 0
                  ? 'Percakapan saat ini masih kosong'
                  : 'Mulai Percakapan Baru'
              }
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 disabled:cursor-not-allowed text-white rounded-sm text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Chat Baru</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              title="Pengaturan API Key & Model"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-sm transition-all cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Tutup Modal"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-sm transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </DialogHeader>

        {/* API Key Modal / Settings Bar */}
        {showSettings && (
          <div className="p-3.5 bg-slate-800 text-white border-b border-slate-700 flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
              <div className="flex-1 w-full flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold flex items-center gap-1.5 text-slate-200">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    Custom API Key (Opsional):
                  </label>
                  <span className="text-[10px] text-slate-400">
                    *Tersimpan khusus di akun database Anda
                  </span>
                </div>
                <input
                  type="password"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder="Masukkan API Key Google AI Studio..."
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-sm text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-700/60">
              <span className="text-[11px] text-slate-400">
                *Custom Key & Model tersimpan khusus di database akun Anda dan{' '}
                <strong>tidak mempengaruhi pengguna lain</strong>.
              </span>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-sm transition-all cursor-pointer shadow-sm"
              >
                Simpan Pengaturan
              </button>
            </div>
          </div>
        )}

        {/* Main Content Layout (Sidebar + Chat View) */}
        <div className="flex-1 flex overflow-hidden relative bg-slate-900">
          {/* Collapsible Sidebar for Chat History */}
          {isSidebarOpen && (
            <div className="w-64 bg-slate-900 border-r border-slate-700/70 flex flex-col shrink-0 text-white z-20">
              <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <History className="w-4 h-4 text-amber-400" />
                  <span>Riwayat Sesi Chat</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 hover:bg-slate-800 rounded-sm text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-2 border-b border-slate-800">
                <button
                  type="button"
                  onClick={handleNewChat}
                  disabled={messages.length === 0}
                  title={
                    messages.length === 0
                      ? 'Percakapan saat ini masih kosong'
                      : 'Mulai Percakapan Baru'
                  }
                  className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Buat Chat Baru</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {isLoadingSessions ? (
                  <div className="flex items-center justify-center py-8 text-xs text-slate-400 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Memuat riwayat...</span>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8 px-2 text-xs text-slate-500">
                    Belum ada riwayat percakapan tersimpan.
                  </div>
                ) : (
                  sessions.map((sess) => {
                    const isActive = activeSessionId === sess.id;
                    return (
                      <div
                        key={sess.id}
                        onClick={() => loadSessionMessages(sess.id)}
                        className={`group flex items-center justify-between p-2 rounded-sm text-xs cursor-pointer transition-all border ${
                          isActive
                            ? 'bg-slate-800 border-emerald-500 text-white font-medium shadow-sm'
                            : 'bg-slate-900/50 border-transparent text-slate-300 hover:bg-slate-800/70 hover:text-white'
                        }`}
                      >
                        <div className="flex items-start gap-2 overflow-hidden flex-1 min-w-0 pr-1">
                          <MessageSquare
                            className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                              isActive ? 'text-emerald-400' : 'text-slate-500'
                            }`}
                          />
                          <div className="truncate flex-1">
                            <div className="truncate font-medium text-[11px] leading-tight">
                              {sess.title || 'Percakapan Baru'}
                            </div>
                            <div className="text-[9px] text-slate-500 mt-0.5">
                              {new Date(sess.updatedAt).toLocaleDateString(
                                'id-ID',
                                {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(sess.id, e)}
                          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-sm transition-all cursor-pointer shrink-0"
                          title="Hapus Sesi Chat Ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Right Main Chat Panel */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
            {/* Active Context Banner */}
            <div className="px-4 py-2 bg-emerald-50/80 border-b border-emerald-100/90 flex items-center justify-between text-xs text-emerald-900 font-medium">
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  Konteks Terhubung: <strong>RTU System Sinar Utama</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-white border border-emerald-200 text-emerald-800 rounded-sm text-[10px] font-semibold flex items-center gap-1 shadow-2xs">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Akses: {allowedModulesList.length} Modul Aktif
                </span>
              </div>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-white">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-sm bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] p-3.5 rounded-sm text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white font-medium shadow-sm'
                        : 'bg-slate-50 border border-slate-200/90 text-slate-800 space-y-2'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <div className="whitespace-pre-wrap font-sans">
                        {msg.content}
                      </div>
                    ) : (
                      <FormattedMarkdown content={msg.content} />
                    )}

                    {msg.role === 'assistant' ? (
                      <div className="flex items-center justify-between border-t border-slate-200/80 pt-1.5 mt-2">
                        <div className="text-[9px] text-slate-400 font-medium flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>{msg.timestamp}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="px-1.5 py-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-sm transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
                          title="Salin Teks Jawaban"
                        >
                          {copiedMsgId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="text-emerald-600 font-semibold">
                                Tersalin
                              </span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 shrink-0" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="text-[9px] mt-1.5 text-slate-400 text-right font-sans">
                        {msg.timestamp}
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-sm bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-sm bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm text-xs text-slate-600 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>
                      AI Analyst sedang menganalisis data operasional RTU...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Presets */}
            <div
              className="p-2.5 bg-slate-100/90 border-t border-slate-200 flex items-center gap-2 overflow-x-auto"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap px-1 shrink-0">
                Pertanyaan Cepat:
              </span>

              {(hasPurchase || hasInvoice || hasMaterial) && (
                <button
                  type="button"
                  onClick={() =>
                    handlePresetClick(
                      'Tolong audit dan deteksi anomali harga beli material di PO / GRN / Invoice yang menyimpang atau berbeda signifikan dari Harga Master (master data material). Sajikan dalam tabel audit rinci beserta deviasi (%) dan vendor terkait.'
                    )
                  }
                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 border border-red-200/90 text-red-700 hover:text-red-800 rounded-sm text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
                >
                  <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
                  Deteksi Harga Material Anomali
                </button>
              )}

              {hasMaterial && (
                <button
                  type="button"
                  onClick={() =>
                    handlePresetClick(
                      'Tolong audit dan deteksi anomali saldo/mutasi stok material (dead stock, overstock, understock kritis, atau penyusutan drastis) di seluruh outlet/CK. Sajikan dalam tabel audit rinci.'
                    )
                  }
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200/90 text-amber-800 hover:text-amber-900 rounded-sm text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
                >
                  <TrendingDown className="w-3 h-3 text-amber-600 shrink-0" />
                  Deteksi Stok Anomali
                </button>
              )}

              {hasProduction && (
                <button
                  type="button"
                  onClick={() =>
                    handlePresetClick(
                      'Tolong audit dan deteksi anomali jumlah/output produksi batch yang menyimpang dari standar resep (yield loss) atau memiliki lonjakan biaya HPP tak wajar per batch. Sajikan dalam tabel audit rinci.'
                    )
                  }
                  className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 border border-orange-200/90 text-orange-800 hover:text-orange-900 rounded-sm text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
                >
                  <Layers className="w-3 h-3 text-orange-600 shrink-0" />
                  Deteksi Produksi Anomali
                </button>
              )}

              {hasMaterial && (
                <button
                  type="button"
                  onClick={() =>
                    handlePresetClick(
                      'Tolong analisa ketersediaan stok bahan baku kritis dan berikan rekomendasi re-order point untuk outlet.'
                    )
                  }
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-200/90 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 rounded-sm text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
                >
                  <Package className="w-3 h-3 text-emerald-600 shrink-0" />
                  Analisis Stok Bahan Baku
                </button>
              )}

              {hasProduction && (
                <button
                  type="button"
                  onClick={() =>
                    handlePresetClick(
                      'Bagaimana evaluasi tren HPP Job Costing produksi bulan ini? Apakah ada deviasi biaya bahan baku/overhead?'
                    )
                  }
                  className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200/90 hover:border-blue-300 text-slate-700 hover:text-blue-700 rounded-sm text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
                >
                  <Layers className="w-3 h-3 text-blue-600 shrink-0" />
                  Evaluasi HPP Produksi
                </button>
              )}

              {hasPurchase && (
                <button
                  type="button"
                  onClick={() =>
                    handlePresetClick(
                      'Tolong berikan ringkasan Purchase Order (PO) yang belum lunas atau masih diproses.'
                    )
                  }
                  className="px-2.5 py-1 bg-white hover:bg-purple-50 border border-slate-200/90 hover:border-purple-300 text-slate-700 hover:text-purple-800 rounded-sm text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
                >
                  <ShoppingCart className="w-3 h-3 text-purple-600 shrink-0" />
                  Ringkasan Purchase Order
                </button>
              )}

              {hasInvoice && (
                <button
                  type="button"
                  onClick={() =>
                    handlePresetClick(
                      'Bagaimana status rekonsiliasi Invoice Reconcile vs PO dan Penerimaan Barang (GRN)?'
                    )
                  }
                  className="px-2.5 py-1 bg-white hover:bg-amber-50 border border-slate-200/90 hover:border-amber-300 text-slate-700 hover:text-amber-800 rounded-sm text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
                >
                  <FileText className="w-3 h-3 text-amber-600 shrink-0" />
                  Rekonsiliasi Invoice
                </button>
              )}
            </div>

            {/* Input Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-col gap-2">
              {attachedFile && (
                <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-sm flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 overflow-hidden text-slate-200">
                    <Paperclip className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-medium truncate">
                      {attachedFile.name}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      ({(attachedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="text-slate-400 hover:text-white p-0.5 rounded-sm transition-colors cursor-pointer"
                    title="Hapus Lampiran"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Unified Gemini Chat Bar */}
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus-within:border-emerald-500/60 rounded-sm px-2.5 py-1.5 transition-all shadow-inner">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".csv,.txt,.json,.pdf,.xlsx,.xls,.png,.jpg,.jpeg"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Tambahkan Berkas / File Data RTU (CSV, PDF, TXT, Gambar)"
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-sm transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-4.5 h-4.5" />
                </button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Tanyakan sesuatu ke AI RTU Analyst..."
                  className="flex-1 bg-transparent px-1 py-1 text-xs text-white placeholder-slate-400 focus:outline-none"
                  disabled={isLoading}
                />

                <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-slate-800">
                  <select
                    value={selectedModel}
                    onChange={(e) => handleModelChange(e.target.value)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-sm px-2 py-1 text-[11px] font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer transition-colors"
                    title="Pilih Model AI"
                  >
                    <option value="gemini-3.5-flash-lite">
                      3.5 Flash Lite (15 RPM)
                    </option>
                    <option value="gemini-3.1-flash-lite">
                      3.1 Flash Lite (15 RPM)
                    </option>
                    <option value="gemini-2.5-flash">2.5 Flash (5 RPM)</option>
                    <option value="gemini-3.5-flash">3.5 Flash (5 RPM)</option>
                    <option value="gemini-3.7-flash">3.7 Flash (5 RPM)</option>
                    <option value="gemini-3-flash">3 Flash (5 RPM)</option>
                    <option value="gemini-1.5-flash">1.5 Flash</option>
                    <option value="auto">Auto Discovery</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={isLoading || (!input.trim() && !attachedFile)}
                    className="p-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-sm transition-all disabled:opacity-40 cursor-pointer shrink-0"
                    title="Kirim Pesan"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
