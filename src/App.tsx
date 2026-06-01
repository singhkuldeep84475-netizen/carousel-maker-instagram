import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Code2, Image, Download, Archive, Loader2,
  Sparkles, ChevronLeft, ChevronRight, FileType, Trash2,
  Upload, User
} from 'lucide-react';
import { exportNodeAsImage, exportAllAsZip, ExportFormat } from './utils/exportUtils';
import { cn } from './utils/cn';

const SAMPLE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
    body {
        margin: 0;
        background: #000;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 60px;
        padding: 60px 20px;
        font-family: 'Inter', sans-serif;
    }
    .slide {
        width: 1080px;
        height: 1350px;
        background: #FFFFFF;
        position: relative;
        box-sizing: border-box;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 100px;
    }
    h1 { font-size: 72px; font-weight: 900; color: #131722; margin: 0 0 30px; line-height: 1.1; }
    h1 span { color: #7E57C2; }
    p { font-size: 36px; color: #787B86; margin: 0; line-height: 1.5; }
    .watermark { position: absolute; bottom: 40px; width: 100%; text-align: center; font-size: 24px; font-weight: 700; color: #787B86; letter-spacing: 2px; opacity: 0.6; }
</style>
</head>
<body>
    <div class="slide">
        <h1>WHAT IS <span>LIQUIDITY</span>?</h1>
        <p>Understanding where smart money moves in the market.</p>
        <div class="watermark">@yourusername</div>
    </div>
    <div class="slide">
        <h1>BUY-SIDE <span>LIQUIDITY</span></h1>
        <p>Stop losses above highs create pools of liquidity that institutions target.</p>
        <div class="watermark">@yourusername</div>
    </div>
</body>
</html>`;

const App: React.FC = () => {
  const [htmlCode, setHtmlCode] = useState('');
  const [slideNodes, setSlideNodes] = useState<HTMLElement[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSlide, setSelectedSlide] = useState(0);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  
  // Drag & drop file state
  const [isDragging, setIsDragging] = useState(false);

  // Custom Branding State
  const [enableBranding, setEnableBranding] = useState(false);
  const [instaHandle, setInstaHandle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showVerified, setShowVerified] = useState(false);

  const renderContainerRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseAndRender = useCallback(() => {
    if (!htmlCode.trim()) {
      setError('Please paste or upload your HTML code first.');
      return;
    }
    setIsProcessing(true);
    setError(null);
    setSlideNodes([]);

    // Use a timeout so UI updates before heavy work
    setTimeout(() => {
      try {
        const container = renderContainerRef.current;
        if (!container) throw new Error('Render container not found');

        // Clear previous
        container.innerHTML = '';

        // Create a shadow wrapper to isolate styles
        const wrapper = document.createElement('div');

        // Parse HTML to extract styles and body
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlCode, 'text/html');

        // Extract all <style> tags and <link> tags
        const styles = doc.querySelectorAll('style');
        const links = doc.querySelectorAll('link[rel="stylesheet"]');

        // Clone styles into wrapper
        styles.forEach(style => {
          const cloned = style.cloneNode(true) as HTMLStyleElement;
          wrapper.appendChild(cloned);
        });

        links.forEach(link => {
          const cloned = link.cloneNode(true) as HTMLLinkElement;
          wrapper.appendChild(cloned);
        });

        // Get slide elements from parsed HTML
        const slides = doc.querySelectorAll('.slide');

        if (slides.length === 0) {
          throw new Error('No elements with class "slide" found in your HTML. Make sure your slide containers have class="slide".');
        }

        const renderedNodes: HTMLElement[] = [];

        slides.forEach((slide, index) => {
          const slideClone = slide.cloneNode(true) as HTMLElement;
          slideClone.id = `render-slide-${index}`;
          
          // Inject custom branding if enabled
          if (enableBranding) {
            const watermarks = slideClone.querySelectorAll('.watermark');
            watermarks.forEach(watermark => {
              // Force parent opacity to 1 so the dark pill is highly readable
              (watermark as HTMLElement).style.opacity = '1';
              
              const handleText = instaHandle.trim() 
                ? (instaHandle.startsWith('@') ? instaHandle : `@${instaHandle}`)
                : '@yourusername';
              
              watermark.innerHTML = `
                <div style="display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 10px 20px; background: rgba(0, 0, 0, 0.65); border-radius: 12px; border: 1.5px solid rgba(255, 255, 255, 0.15); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); color: #ffffff; text-align: center; vertical-align: middle; box-shadow: 0 8px 32px rgba(0,0,0,0.25);">
                  ${avatarUrl ? `<img src="${avatarUrl}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 1.5px solid rgba(255,255,255,0.25); flex-shrink: 0;" />` : ''}
                  <span style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px; text-transform: none; font-family: 'Inter', sans-serif;">${handleText}</span>
                  ${showVerified ? `
                    <svg viewBox="0 0 24 24" width="22" height="22" style="flex-shrink: 0; fill: #0095f6; display: inline-block; vertical-align: middle; margin-left: 2px;">
                      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.488 0-.95.1-1.37.28C14.73 2.5 13.435 1.5 12 1.5s-2.73 1-3.402 2.29c-.42-.18-.882-.28-1.37-.28C5.12 3.51 3.41 5.29 3.41 7.5c0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.488 0 .95-.1 1.37-.28.672 1.29 1.967 2.29 3.402 2.29s2.73-1 3.402-2.29c.42.18.882.28 1.37.28 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.5 4l-4-4 1.41-1.41L10 13.67l6.59-6.59 1.41 1.41-8 8z" />
                    </svg>
                  ` : ''}
                </div>
              `;
            });
          }

          // Force exact dimensions for export
          slideClone.style.width = '1080px';
          slideClone.style.height = '1350px';
          slideClone.style.position = 'relative';
          slideClone.style.overflow = 'hidden';
          slideClone.style.flexShrink = '0';

          wrapper.appendChild(slideClone);
          renderedNodes.push(slideClone);
        });

        container.appendChild(wrapper);

        // Wait for fonts/images to load
        setTimeout(() => {
          setSlideNodes(renderedNodes);
          setSelectedSlide(0);
          setIsProcessing(false);
        }, 500);

      } catch (err: any) {
        setError(err.message || 'Failed to parse HTML');
        setIsProcessing(false);
      }
    }, 100);
  }, [htmlCode, enableBranding, instaHandle, avatarUrl, showVerified]);

  // Live reload slides when branding changes to keep preview synced
  useEffect(() => {
    if (htmlCode.trim() && slideNodes.length > 0) {
      parseAndRender();
    }
  }, [enableBranding, instaHandle, avatarUrl, showVerified]);

  const handleExportSingle = async () => {
    if (slideNodes.length === 0 || isExporting) return;
    setIsExporting(true);
    try {
      const filename = `${instaHandle.trim() ? instaHandle.replace('@', '') : 'slide'}-${String(selectedSlide + 1).padStart(2, '0')}`;
      await exportNodeAsImage(slideNodes[selectedSlide], filename, exportFormat);
    } catch (err: any) {
      console.error('Export error:', err);
      alert('Failed to export slide. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAll = async () => {
    if (slideNodes.length === 0 || isExportingAll) return;
    setIsExportingAll(true);
    setExportProgress({ current: 0, total: slideNodes.length });
    try {
      const zipName = instaHandle.trim() ? instaHandle.replace('@', '') : 'carousel';
      await exportAllAsZip(slideNodes, zipName, exportFormat, (current, total) => {
        setExportProgress({ current, total });
      });
    } catch (err: any) {
      console.error('Export error:', err);
      alert('Failed to export slides. Please try again.');
    } finally {
      setIsExportingAll(false);
      setExportProgress({ current: 0, total: 0 });
    }
  };

  const loadSample = () => {
    setHtmlCode(SAMPLE_HTML);
  };

  const handleClear = () => {
    setHtmlCode('');
    setSlideNodes([]);
    setSelectedSlide(0);
    setError(null);
    if (renderContainerRef.current) {
      renderContainerRef.current.innerHTML = '';
    }
  };

  const scrollPreview = (direction: 'left' | 'right') => {
    if (previewScrollRef.current) {
      previewScrollRef.current.scrollBy({
        left: direction === 'left' ? -280 : 280,
        behavior: 'smooth',
      });
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.html')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setHtmlCode(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  // File Upload Handlers
  const handleHtmlFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setHtmlCode(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen">
      {/* Hidden render container */}
      <div id="render-container" ref={renderContainerRef} />

      {/* Header */}
      <header className="border-b border-white/5 backdrop-blur-xl bg-white/[0.02] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  InstaCarousel Designer
                </h1>
                <p className="text-[11px] text-white/30 -mt-0.5">Parse HTML • Brand Instantly • Export 4:5 ZIP</p>
              </div>
            </div>

            {slideNodes.length > 0 && (
              <div className="flex items-center gap-2 animate-fadeIn">
                <span className="text-xs text-indigo-400 bg-indigo-500/10 px-3.5 py-1.5 rounded-full border border-indigo-500/25 font-semibold">
                  {slideNodes.length} Slide{slideNodes.length !== 1 ? 's' : ''} Loaded
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Input Phase - Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* HTML Input Section - Takes 2/3 width */}
          <section className="lg:col-span-2">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm h-full flex flex-col justify-between">
              <div>
                {/* Toolbar */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-medium text-white/60">HTML Code</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs px-3 py-1.5 rounded-lg text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-1.5"
                    >
                      <Upload className="w-3 h-3" /> Upload HTML
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      accept=".html" 
                      onChange={handleHtmlFileUpload} 
                      className="hidden" 
                    />
                    <button
                      onClick={loadSample}
                      className="text-xs px-3 py-1.5 rounded-lg text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all"
                    >
                      Load Sample
                    </button>
                    <button
                      onClick={handleClear}
                      disabled={!htmlCode}
                      className="text-xs px-3 py-1.5 rounded-lg text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Clear
                    </button>
                  </div>
                </div>

                {/* Editor Area with Drag-and-Drop */}
                <div className="relative">
                  <textarea
                    id="html-input"
                    value={htmlCode}
                    onChange={(e) => setHtmlCode(e.target.value)}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    placeholder={`Paste your full HTML code here, or drag & drop an HTML file...\n\nYour HTML should contain elements with class="slide" (1080×1350px).\nWatermarks inside class="watermark" will be automatically updated.`}
                    className={cn(
                      "html-editor w-full bg-transparent text-white/80 placeholder:text-white/15 p-5 focus:outline-none transition-all duration-200 resize-none font-mono text-xs leading-relaxed",
                      isDragging && "bg-indigo-500/[0.05] border border-dashed border-indigo-500/50"
                    )}
                    style={{ minHeight: '320px', maxHeight: '420px' }}
                    spellCheck={false}
                  />
                  {isDragging && (
                    <div className="absolute inset-0 bg-indigo-500/5 backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-2 animate-bounce">
                        <Upload className="w-5 h-5 text-indigo-400" />
                      </div>
                      <p className="text-xs text-indigo-400 font-semibold">Drop your HTML file here</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between px-5 py-4 border-t border-white/5 bg-white/[0.02] mt-auto">
                <p className="text-[11px] text-white/25">
                  {htmlCode ? `${htmlCode.length.toLocaleString()} characters` : 'No code loaded'}
                </p>
                <button
                  id="parse-button"
                  onClick={parseAndRender}
                  disabled={!htmlCode.trim() || isProcessing}
                  className={cn(
                    'flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm',
                    'bg-gradient-to-r from-indigo-500 to-purple-600 text-white',
                    'hover:from-indigo-600 hover:to-purple-700',
                    'shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30',
                    'transition-all duration-200',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                    'hover:scale-[1.02] active:scale-[0.98]'
                  )}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Rendering Carousel...
                    </>
                  ) : (
                    <>
                      <Image className="w-4 h-4" />
                      Generate Slides
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* Custom Branding & Settings Panel - Takes 1/3 width */}
          <section className="lg:col-span-1">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-sm flex flex-col h-full justify-between">
              <div>
                {/* Branding Panel Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Premium Branding</h2>
                  </div>
                  
                  {/* Enable Switch Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={enableBranding} 
                      onChange={(e) => setEnableBranding(e.target.checked)} 
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {!enableBranding ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 text-white/20">
                      <User className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-white/40 font-semibold mb-1">Custom Branding is OFF</p>
                    <p className="text-[11px] text-white/20 max-w-[200px]">
                      Enable custom branding to auto-inject your logo, Instagram handle, and verified badge into your slides.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 animate-fadeIn">
                    {/* Avatar Upload */}
                    <div>
                      <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2.5">Avatar Logo</label>
                      <div className="flex items-center gap-4">
                        <div className="relative w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-white/20" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <label className="inline-flex items-center justify-center px-4 py-2 border border-white/10 rounded-xl text-xs font-semibold text-white/70 hover:bg-white/5 cursor-pointer transition-all w-full text-center">
                            <Upload className="w-3.5 h-3.5 mr-2" />
                            Upload Logo
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleAvatarUpload} 
                              className="hidden" 
                            />
                          </label>
                          {avatarUrl && (
                            <button 
                              onClick={() => setAvatarUrl(null)}
                              className="flex items-center justify-center gap-1.5 text-[10px] text-red-400/80 hover:text-red-400 transition-colors w-full"
                            >
                              <Trash2 className="w-2.5 h-2.5" /> Remove Logo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Instagram Handle */}
                    <div>
                      <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Instagram Handle</label>
                      <input
                        type="text"
                        value={instaHandle}
                        onChange={(e) => setInstaHandle(e.target.value)}
                        placeholder="@yourusername"
                        className="w-full bg-black/20 border border-white/10 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none placeholder:text-white/20 transition-colors"
                      />
                    </div>

                    {/* Verified Badge Checkbox */}
                    <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                      <div className="flex items-center gap-2">
                        <svg viewBox="0 0 24 24" width="18" height="18" style={{ fill: '#0095f6' }}>
                          <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.488 0-.95.1-1.37.28C14.73 2.5 13.435 1.5 12 1.5s-2.73 1-3.402 2.29c-.42-.18-.882-.28-1.37-.28C5.12 3.51 3.41 5.29 3.41 7.5c0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.488 0 .95-.1 1.37-.28.672 1.29 1.967 2.29 3.402 2.29s2.73-1 3.402-2.29c.42.18.882.28 1.37.28 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.5 4l-4-4 1.41-1.41L10 13.67l6.59-6.59 1.41 1.41-8 8z" />
                        </svg>
                        <span className="text-xs font-semibold text-white/70">Verified Tick</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={showVerified} 
                          onChange={(e) => setShowVerified(e.target.checked)} 
                          className="sr-only peer" 
                        />
                        <div className="w-8 h-4 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
                      </label>
                    </div>
                  </div>
                )}
              </div>
              
              {enableBranding && (
                <div className="mt-6 pt-4 border-t border-white/5 animate-fadeIn">
                  <label className="block text-[9px] font-bold text-white/20 uppercase tracking-wider mb-2">Live Watermark Preview</label>
                  <div className="flex items-center justify-center p-3 bg-black/30 border border-white/5 rounded-xl text-white/50 text-xs">
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {avatarUrl ? (
                        <img src={avatarUrl} style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                      ) : (
                        <div className="w-[20px] h-[20px] rounded-full bg-white/10 flex items-center justify-center"><User className="w-2.5 h-2.5 text-white/30" /></div>
                      )}
                      <span style={{ fontWeight: 700 }}>
                        {instaHandle.trim() ? (instaHandle.startsWith('@') ? instaHandle : `@${instaHandle}`) : '@yourusername'}
                      </span>
                      {showVerified && (
                        <svg viewBox="0 0 24 24" width="13" height="13" style={{ fill: '#0095f6' }}>
                          <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.488 0-.95.1-1.37.28C14.73 2.5 13.435 1.5 12 1.5s-2.73 1-3.402 2.29c-.42-.18-.882-.28-1.37-.28C5.12 3.51 3.41 5.29 3.41 7.5c0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.488 0 .95-.1 1.37-.28.672 1.29 1.967 2.29 3.402 2.29s2.73-1 3.402-2.29c.42.18.882.28 1.37.28 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.5 4l-4-4 1.41-1.41L10 13.67l6.59-6.59 1.41 1.41-8 8z" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
            >
              <p>{error}</p>
              <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400 transition-colors">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Processing Skeleton */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
                <p className="text-sm text-white/50">Parsing HTML & rendering slides...</p>
              </div>
              <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 rounded-xl animate-shimmer" style={{ width: '216px', aspectRatio: '4/5', animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Slides Preview & Export */}
        <AnimatePresence>
          {slideNodes.length > 0 && !isProcessing && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* Preview Carousel */}
              <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Slide Previews</h2>
                  <div className="flex gap-2">
                    <button onClick={() => scrollPreview('left')} className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white/80 hover:bg-white/10 transition-all">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => scrollPreview('right')} className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white/80 hover:bg-white/10 transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div ref={previewScrollRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                  {slideNodes.map((node, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      className="flex-shrink-0 snap-center"
                      style={{ width: '216px' }}
                    >
                      <div
                        onClick={() => setSelectedSlide(index)}
                        className={cn(
                          'slide-thumb cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-300 relative bg-black',
                          index === selectedSlide
                            ? 'border-indigo-500 scale-[1.02] shadow-lg shadow-indigo-500/25'
                            : 'border-transparent hover:border-white/10'
                        )}
                        style={{ width: '216px', height: '270px' }}
                      >
                        <div 
                          dangerouslySetInnerHTML={{ __html: node.outerHTML }} 
                          className="origin-top-left scale-[0.2] pointer-events-none absolute inset-0"
                          style={{ width: '1080px', height: '1350px' }}
                        />
                      </div>
                      <p className="text-center text-xs text-white/40 mt-2.5 font-medium">
                        Slide {index + 1}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Export Panel */}
              <section className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-5">
                  <Download className="w-4 h-4 text-white/40" />
                  <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Export</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Format Toggle */}
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 text-white/70 text-sm">
                      <FileType className="w-4 h-4" />
                      <span>Format</span>
                    </div>
                    <div className="flex bg-black/20 rounded-lg p-1">
                      <button
                        onClick={() => setExportFormat('png')}
                        className={cn(
                          'px-3 py-1 text-xs font-medium rounded-md transition-all',
                          exportFormat === 'png' ? 'bg-white/10 text-white shadow-sm' : 'text-white/50 hover:text-white/80'
                        )}
                      >PNG</button>
                      <button
                        onClick={() => setExportFormat('jpg')}
                        className={cn(
                          'px-3 py-1 text-xs font-medium rounded-md transition-all',
                          exportFormat === 'jpg' ? 'bg-white/10 text-white shadow-sm' : 'text-white/50 hover:text-white/80'
                        )}
                      >JPG</button>
                    </div>
                  </div>

                  {/* Export Single */}
                  <button
                    id="export-single-button"
                    onClick={handleExportSingle}
                    disabled={isExporting || isExportingAll}
                    className={cn(
                      'flex items-center justify-center gap-2 px-4 py-3 rounded-xl',
                      'bg-white/5 border border-white/10',
                      'text-white/70 text-sm font-medium',
                      'hover:bg-white/10 hover:text-white hover:border-white/20',
                      'transition-all duration-200',
                      'disabled:opacity-40 disabled:cursor-not-allowed'
                    )}
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Image className="w-4 h-4" />
                    )}
                    Slide {selectedSlide + 1} as {exportFormat.toUpperCase()}
                  </button>

                  {/* Export All */}
                  <button
                    id="export-all-button"
                    onClick={handleExportAll}
                    disabled={isExporting || isExportingAll}
                    className={cn(
                      'flex items-center justify-center gap-2 px-4 py-3 rounded-xl',
                      'bg-gradient-to-r from-indigo-500 to-purple-600',
                      'text-white text-sm font-semibold',
                      'hover:from-indigo-600 hover:to-purple-700',
                      'shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30',
                      'transition-all duration-200',
                      'disabled:opacity-40 disabled:cursor-not-allowed',
                      'hover:scale-[1.01] active:scale-[0.99]'
                    )}
                  >
                    {isExportingAll ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {exportProgress.current}/{exportProgress.total}
                      </>
                    ) : (
                      <>
                        <Archive className="w-4 h-4" />
                        All as ZIP
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-white/20 text-center mt-4">
                  Exports at 1080×1350px (4:5 ratio) • Instagram-ready
                </p>
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {slideNodes.length === 0 && !isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-white/5 flex items-center justify-center mb-6 animate-float">
              <Code2 className="w-8 h-8 text-indigo-400/40" />
            </div>
            <h2 className="text-xl font-semibold text-white/40 mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Paste HTML or Upload File
            </h2>
            <p className="text-sm text-white/20 text-center max-w-sm mb-6">
              Paste your HTML code, drop an HTML file, or upload one to generate your 4:5 Instagram carousel slides.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-sm px-5 py-2.5 rounded-xl text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-2"
              >
                <Upload className="w-4 h-4" /> Upload HTML File
              </button>
              <button
                onClick={loadSample}
                className="text-sm px-5 py-2.5 rounded-xl text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all"
              >
                Try with Sample HTML
              </button>
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-xs text-white/20">
            InstaCarousel Designer • Premium HTML to 4:5 Instagram Carousel Creator
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
