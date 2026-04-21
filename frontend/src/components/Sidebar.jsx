import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileUp, File as FileIcon, UploadCloud, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import axios from 'axios';

export default function Sidebar({ isOpen, setIsOpen }) {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
        setUploadStatus('error');
        setStatusMessage('Please select a PDF file.');
        return;
      }
      setFile(selectedFile);
      setUploadStatus('idle');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type !== 'application/pdf') {
        setUploadStatus('error');
        setStatusMessage('Please select a PDF file.');
        return;
      }
      setFile(droppedFile);
      setUploadStatus('idle');
    }
  };

  const uploadFile = async () => {
    if (!file) return;

    setUploadStatus('uploading');
    setStatusMessage('Uploading and processing document...');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:8000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadStatus('success');
      setStatusMessage(response.data.message || 'Successfully uploaded!');
    } catch (error) {
      console.error(error);
      setUploadStatus('error');
      setStatusMessage(error.response?.data?.detail || 'Failed to upload document.');
    }
  };

  return (
    <motion.aside
      initial={{ width: isOpen ? 320 : 0 }}
      animate={{ width: isOpen ? 320 : 0 }}
      className="bg-secondary/80 md:bg-secondary/40 backdrop-blur-3xl md:backdrop-blur-xl border-r border-white/10 z-50 flex flex-col overflow-hidden absolute md:relative h-full shrink-0 shadow-2xl md:shadow-none transition-colors"
    >
      <div className="w-[320px] min-w-[320px] p-6 h-full flex flex-col">
        <div className="flex items-center gap-3 mb-8 relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent to-purple-600 flex items-center justify-center shadow-lg shadow-accent/20 shrink-0">
            <FileUp className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white truncate pr-8">RAG Engine</h1>
          <button 
            onClick={() => setIsOpen(false)}
            className="md:hidden absolute right-0 top-1/2 -translate-y-1/2 p-2 -mr-2 rounded-lg text-textMuted hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1">
          <h2 className="text-sm font-medium text-textMuted uppercase tracking-wider mb-4">Document Source</h2>
          
          {/* Default Upload Area */}
          <div 
            className="border-2 border-dashed border-white/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-colors hover:border-accent/50 hover:bg-white/5 cursor-pointer group"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".pdf" 
              className="hidden" 
            />
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <UploadCloud className="text-textMuted group-hover:text-accent w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-white mb-1">Upload a Document</p>
            <p className="text-xs text-textMuted">Drag and drop or click to browse</p>
            <p className="text-[10px] text-textMuted mt-2">Supports PDF up to 50MB</p>
          </div>

          {/* Selected File Details */}
          {file && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3"
            >
              <FileIcon className="text-accent w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                 <p className="text-sm font-medium text-white truncate">{file.name}</p>
                 <p className="text-xs text-textMuted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </motion.div>
          )}

          {/* Upload Button */}
          {file && uploadStatus !== 'success' && (
             <button
              onClick={uploadFile}
              disabled={uploadStatus === 'uploading'}
              className="w-full mt-4 py-2.5 rounded-xl bg-accent text-white font-medium text-sm transition-all hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
             >
               {uploadStatus === 'uploading' ? (
                 <><Loader2 className="w-4 h-4 animate-spin"/> Processing...</>
               ) : 'Process Document'}
             </button>
          )}

          {/* Status Message */}
          {statusMessage && (
            <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 text-sm ${uploadStatus === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
              {uploadStatus === 'error' ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />}
              <p>{statusMessage}</p>
            </div>
          )}
        </div>
        
        <div className="mt-auto pt-6 border-t border-white/10">
           <p className="text-xs text-textMuted text-center">RAG AI System v1.0</p>
        </div>
      </div>
    </motion.aside>
  );
}
