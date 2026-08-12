"use client";
import { useState, use } from "react";
import { FolderOpen, AlertTriangle, Upload, Loader2 } from "lucide-react";
import { FileBreadcrumbs } from "@/features/file-manager/components/FileBreadcrumbs";
import { FileList } from "@/features/file-manager/components/FileList";
import { FileEditor } from "@/features/file-manager/components/FileEditor";
import { fsOperation } from "@/features/servers/services/serverApi";
import { useToast } from "@/shared/ui/ToastProvider";
import { Button } from "@/shared/ui/Button";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

const CHUNK_SIZE = 1024 * 1024 * 5; 

export default function FilesPage({ params }) {
  const t = useTranslations("ServerFiles");
  const unwrappedParams = use(params);
  const serverId = unwrappedParams.id;
  const [currentPath, setCurrentPath] = useState("");
  const [files, setFiles] = useState([]);
  const [editingFile, setEditingFile] = useState(null);
  const [deletingFile, setDeletingFile] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCreateFile, setShowCreateFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingText, setUploadingText] = useState("");
  const fileInputRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadFiles();
  }, [currentPath, serverId]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const data = await fsOperation(serverId, { action: "list", filePath: currentPath || "/" });
      if (Array.isArray(data)) setFiles(data);
      else if (data.files) setFiles(data.files);
    } catch (err) {
      if (err.code !== 'AGENT_OFFLINE') console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (pathOrDir) => {
    if (pathOrDir === "") {
      setCurrentPath("");
      return;
    }
    const newPath = currentPath ? `${currentPath}/${pathOrDir}` : pathOrDir;
    setCurrentPath(newPath);
  };

  const handleBreadcrumbNavigate = (absolutePath) => {
    setCurrentPath(absolutePath);
    setEditingFile(null);
  };

  const handleEdit = (file) => {
    const fullPath = currentPath ? `${currentPath}/${file.name}` : file.name;
    setEditingFile(fullPath);
  };

  const confirmDelete = async (fileName) => {
    try {
      setIsDeleting(true);
      const targetPath = currentPath ? `${currentPath}/${fileName}` : fileName;
      await fsOperation(serverId, { action: "delete", filePath: targetPath });
      toast(`${t("fileDeletedToast")}${fileName}`, "success");
      setDeletingFile(null);
      loadFiles();
    } catch (err) {
      toast(`${t("deleteErrorToast")}${err.message}`, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateFileSubmit = () => {
    if (!newFileName.trim()) return;
    const fullPath = currentPath ? `${currentPath}/${newFileName.trim()}` : newFileName.trim();
    setEditingFile(fullPath);
    setShowCreateFile(false);
    setNewFileName("");
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading && !editingFile) setIsDragging(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading && !editingFile) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (uploading || editingFile) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload({ target: { files: e.dataTransfer.files } });
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    let successCount = 0;

    try {
      for (let f = 0; f < files.length; f++) {
        const file = files[f];
        
        if (file.name.includes('..') || file.name.includes('/')) {
          toast(`${file.name} tiene un nombre inválido.`, "error");
          continue;
        }
        if (file.size > 500 * 1024 * 1024) { 
          toast(`${file.name} excede el límite de 500MB.`, "error");
          continue;
        }

        setUploadingText(`Subiendo ${f + 1} de ${files.length}...`);
        
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
        
        await fsOperation(serverId, {
          action: "write",
          filePath: filePath,
          content: "",
          isBase64: false
        });

        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);
          
          const base64Chunk = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result.split(',')[1]);
            reader.readAsDataURL(chunk);
          });

          await fsOperation(serverId, {
            action: "append",
            filePath: filePath,
            content: base64Chunk,
            isBase64: true
          });
        }
        successCount++;
      }

      if (successCount > 0) {
        toast(`${successCount} ${t("uploadSuccessToast")}`, "success");
        loadFiles();
      }
    } catch (err) {
      console.error("Error subiendo archivos:", err);
      toast(`${t("uploadErrorToast")}${err.message}`, "error");
    } finally {
      setUploading(false);
      setUploadingText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div 
      className="p-8 max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in h-full relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
    >
      {isDragging && (
        <div 
          className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm border-4 border-dashed border-primary rounded-blocky flex flex-col items-center justify-center animate-in fade-in"
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <Upload className="w-16 h-16 text-primary mb-4 animate-bounce" />
          <h2 className="text-3xl font-black text-primary mb-2">{t("dropTitle")}</h2>
          <p className="text-foreground/70 font-bold text-lg">{t("dropSubtitle")}<span className="text-foreground font-mono bg-surface-border px-2 py-1 rounded">{currentPath || "/"}</span></p>
        </div>
      )}
      <div className="flex items-center justify-between bg-surface p-6 rounded-blocky border-2 border-surface-border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-blocky">
            <FolderOpen className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black">{t("explorerTitle")}</h1>
            <p className="text-foreground/70 font-semibold">{serverId}</p>
          </div>
        </div>
        {!editingFile && (
          <div className="flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              multiple
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              {uploading ? uploadingText || t("uploadingBtn") : t("uploadFileBtn")}
            </Button>
            <Button onClick={() => setShowCreateFile(true)} disabled={uploading}>
              {t("newFileBtn")}
            </Button>
          </div>
        )}
      </div>

      {!editingFile && (
        <div className="bg-warning/10 border-2 border-warning/20 p-4 rounded-blocky flex items-start gap-4 animate-in slide-in-from-top-2">
          <AlertTriangle className="w-6 h-6 text-warning shrink-0 mt-0.5" />
          <div>
            <h2 className="text-warning font-bold text-lg mb-1">{t("cautionTitle")}</h2>
            <p className="text-foreground/80 font-semibold text-sm leading-relaxed max-w-4xl">
              {t("cautionDesc")}
            </p>
          </div>
        </div>
      )}

      {showCreateFile && (
        <div className="bg-surface p-4 border-2 border-surface-border rounded-blocky shadow-sm animate-in fade-in flex gap-2">
          <input 
            type="text"
            placeholder={t("fileNamePlaceholder")}
            className="flex-1 bg-background border-2 border-surface-border rounded-blocky px-4 py-2 font-bold focus:outline-none focus:border-primary transition-colors"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFileSubmit()}
            autoFocus
          />
          <Button onClick={handleCreateFileSubmit} disabled={!newFileName.trim()}>{t("create")}</Button>
          <Button variant="outline" onClick={() => { setShowCreateFile(false); setNewFileName(""); }}>{t("cancel")}</Button>
        </div>
      )}

      <FileBreadcrumbs path={currentPath} onNavigate={handleBreadcrumbNavigate} />
      
      {editingFile ? (
        <FileEditor 
          serverId={serverId} 
          filePath={editingFile} 
          onBack={() => {
            setEditingFile(null);
            loadFiles();
          }} 
        />
      ) : loading && files.length === 0 ? (
        <div className="bg-surface border-2 border-surface-border rounded-blocky overflow-hidden shadow-sm flex flex-col">
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} className="flex items-center justify-between p-3 sm:p-4 border-b border-surface-border/50 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-surface-border rounded" />
                <div className="w-48 h-5 bg-surface-border rounded" />
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-4 bg-surface-border rounded hidden sm:block" />
                <div className="w-24 h-4 bg-surface-border rounded hidden sm:block" />
                <div className="w-20 h-8 bg-surface-border rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <FileList 
          files={files} 
          onNavigate={handleNavigate}
          onEdit={handleEdit}
          onDeleteRequest={(fileName) => setDeletingFile(fileName)}
          deletingFile={deletingFile}
          onConfirmDelete={confirmDelete}
          onCancelDelete={() => setDeletingFile(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
