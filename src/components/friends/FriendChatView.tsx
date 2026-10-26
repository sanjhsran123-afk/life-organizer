import React, { useState, useEffect, useRef } from 'react';
import { FriendItem, MessageItem } from '../../types';
import {
  apiGetMessages,
  apiSendMessage,
  apiUploadMessageFile,
  apiGetDownloadUrl,
  apiGetCloudCapabilities,
} from '../../api';
import { useCall } from '../../context/CallContext';
import { useApp } from '../../context/AppContext';
import { getSocket } from '../../utils/socket';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import {
  ArrowLeft,
  Phone,
  Paperclip,
  Send,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Download,
  Check,
  CheckCheck,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Lock,
} from 'lucide-react';

interface FriendChatViewProps {
  friend: FriendItem;
  onBack: () => void;
}

export const FriendChatView: React.FC<FriendChatViewProps> = ({ friend, onBack }) => {
  const { currentUser, showToast } = useApp();
  const { startCall, activeCall } = useCall();

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [r2Configured, setR2Configured] = useState<boolean | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Check backend capabilities (R2 private storage)
  useEffect(() => {
    apiGetCloudCapabilities()
      .then((cap) => setR2Configured(cap.r2Configured))
      .catch(() => setR2Configured(false));
  }, []);

  // Fetch message history
  const loadMessages = async () => {
    try {
      setLoading(true);
      const res = await apiGetMessages(friend.id, 60);
      setMessages(res.messages || []);
      setTimeout(scrollToBottom, 50);
    } catch (err: any) {
      showToast(err.message || 'Failed to load conversation.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [friend.id]);

  // Real-time Socket.io message and read listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (msg: MessageItem) => {
      // Check if message belongs to this conversation
      if (
        (msg.senderId === friend.id && msg.recipientId === currentUser?.id) ||
        (msg.senderId === currentUser?.id && msg.recipientId === friend.id)
      ) {
        setMessages((prev) => {
          // Avoid duplicate insertion
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(scrollToBottom, 50);
      }
    };

    const handleMessageRead = ({ readAt }: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId === currentUser?.id && !m.read
            ? { ...m, read: true, readAt }
            : m
        )
      );
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:read', handleMessageRead);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:read', handleMessageRead);
    };
  }, [friend.id, currentUser?.id]);

  // Send Text Message
  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputText.trim();
    if (!clean || sending) return;

    setInputText('');
    setSending(true);

    try {
      const res = await apiSendMessage(friend.id, clean);
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.message.id)) return prev;
        return [...prev, res.message];
      });
      setTimeout(scrollToBottom, 50);
    } catch (err: any) {
      setInputText(clean);
      showToast(err.message || 'Failed to send message.', 'error');
    } finally {
      setSending(false);
    }
  };

  // Upload File Attachment
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so selecting the same file again works
    e.target.value = '';

    // Max 15MB limit check
    if (file.size > 15 * 1024 * 1024) {
      showToast('File exceeds maximum size limit of 15MB.', 'error');
      return;
    }

    if (r2Configured === false) {
      showToast(
        'Cloudflare R2 private storage is not configured on this server. File sharing is currently disabled.',
        'warning'
      );
      return;
    }

    setUploadingFile(true);
    setUploadProgressText(`Uploading ${file.name}...`);

    try {
      const res = await apiUploadMessageFile(friend.id, file);
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.message.id)) return prev;
        return [...prev, res.message];
      });
      setTimeout(scrollToBottom, 50);
      showToast('File shared securely.', 'success');
    } catch (err: any) {
      showToast(err.message || 'File upload failed.', 'error');
    } finally {
      setUploadingFile(false);
      setUploadProgressText('');
    }
  };

  // Authenticated short-lived download
  const handleDownloadFile = async (messageId: string, filename: string) => {
    try {
      const res = await apiGetDownloadUrl(messageId);
      // Open / trigger authenticated download link
      const link = document.createElement('a');
      link.href = res.downloadUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = filename || res.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      showToast(err.message || 'Failed to download file.', 'error');
    }
  };

  const formatFileSize = (bytes: number = 0) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTimestamp = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getFileIcon = (mimeType?: string) => {
    if (mimeType?.includes('pdf')) {
      return <FileText className="w-5 h-5 text-rose-500" />;
    }
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet') || mimeType?.includes('csv')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    }
    if (mimeType?.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-indigo-500" />;
    }
    return <FileText className="w-5 h-5 text-zinc-500" />;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] md:h-[650px] bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden animate-pop-in">
      {/* Conversation Top Header */}
      <div className="px-4 py-3.5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
            aria-label="Back to Friends"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <Avatar name={friend.name} size="md" className="shrink-0" />

          <div className="min-w-0">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {friend.name}
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Accepted Friend • Encrypted Chat</span>
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={<Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            onClick={() => startCall(friend.id, friend.name, friend.avatarSeed)}
            disabled={Boolean(activeCall)}
            title="Start audio call with friend"
          >
            <span className="hidden sm:inline">Audio Call</span>
          </Button>
        </div>
      </div>

      {/* R2 Warning Banner if not configured */}
      {r2Configured === false && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-900/50 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>Private Cloudflare R2 file storage is unconfigured. Text messaging is fully active.</span>
        </div>
      )}

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-zinc-400 gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Loading conversation...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400 dark:text-zinc-500">
            <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-3">
              <Lock className="w-6 h-6 text-zinc-400" />
            </div>
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Private 1-to-1 conversation with {friend.name}
            </p>
            <p className="text-[11px] text-zinc-500 mt-1 max-w-xs">
              Messages and files are strictly private to you and {friend.name}. Send a hello to get started!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-xs text-xs leading-relaxed ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-xs'
                  }`}
                >
                  {msg.type === 'file' && msg.file ? (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2.5 p-2 rounded-xl bg-black/10 dark:bg-white/10">
                        {getFileIcon(msg.file.mimeType)}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-xs truncate select-all">
                            {msg.file.name}
                          </p>
                          <p className="text-[10px] opacity-75 mt-0.5">
                            {formatFileSize(msg.file.size)}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDownloadFile(msg.id, msg.file?.name || 'download')}
                        className={`w-full py-1.5 px-3 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isMe
                            ? 'bg-white/20 hover:bg-white/30 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Private File</span>
                      </button>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  )}

                  {/* Timestamp & read receipts */}
                  <div
                    className={`flex items-center gap-1 justify-end mt-1 text-[10px] ${
                      isMe ? 'text-indigo-200' : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                  >
                    <span>{formatTimestamp(msg.createdAt)}</span>
                    {isMe && (
                      msg.read ? (
                        <span title="Read by friend">
                          <CheckCheck className="w-3 h-3 text-emerald-300" />
                        </span>
                      ) : (
                        <span title="Delivered">
                          <Check className="w-3 h-3 text-indigo-200" />
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Upload in progress banner */}
        {uploadingFile && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 text-xs text-indigo-700 dark:text-indigo-300">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span className="truncate">{uploadProgressText}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Bottom Bar */}
      <form
        onSubmit={handleSendText}
        className="p-3 border-t border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2 shrink-0"
      >
        {/* File Picker & Attachment Button (Hidden when Cloudflare R2 is unconfigured) */}
        {r2Configured === true && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,image/*"
              onChange={handleFileSelected}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              className="p-2 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              title="Attach document, PDF, or image (Max 15MB)"
              aria-label="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>
          </>
        )}

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Message ${friend.name}...`}
          maxLength={4000}
          className="flex-1 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800/80 border border-transparent focus:border-indigo-500 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none transition-all"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || sending}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 active:scale-95"
          aria-label="Send message"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
};
