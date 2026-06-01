import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Code2, Image, Download, Archive, Loader2,
  Sparkles, ChevronLeft, ChevronRight, FileType, Trash2,
  Upload, User, Settings, FolderDown
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
        <h1>HOW TO BUILD <span>WEALTH</span></h1>
        <p>A simple masterclass on assets vs liabilities.</p>
        <div class="watermark">@financialsingh</div>
    </div>
    <div class="slide">
        <h1>ASSETS VS <span>LIABILITIES</span></h1>
        <p>Assets put money inside your pocket. Liabilities take money out.</p>
        <div class="watermark">@financialsingh</div>
    </div>
    <div class="slide">
        <h1>THE <span>GOLDEN RULE</span></h1>
        <p>Buy assets first. Buy liabilities last, using asset cashflow.</p>
        <div class="watermark">@financialsingh</div>
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
  const [displayName, setDisplayName] = useState('');
  const [instaHandle, setInstaHandle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showVerified, setShowVerified] = useState(false);

  // Dynamic aspect ratio states
  const [slideWidth, setSlideWidth] = useState(1080);
  const [slideHeight, setSlideHeight] = useState(1350);

  // Tab State: 'code' | 'brand' | 'export'
  const [activeTab, setActiveTab] = useState<'code' | 'brand' | 'export'>('code');

  const renderContainerRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseAndRender = useCallback((codeOverride?: string) => {
    const targetCode = typeof codeOverride === 'string' ? codeOverride : htmlCode;
    if (!targetCode.trim()) {
      setError('Please paste or upload your HTML code first.');
      return;
    }
    setIsProcessing(true);
    setError(null);
    setSlideNodes([]);

    // Clean up previous injected styles to prevent leakage between different HTML imports
    document.querySelectorAll('[data-injected="true"]').forEach(el => el.remove());

    // Use a timeout so UI updates before heavy work
    setTimeout(() => {
      try {
        const container = renderContainerRef.current;
        if (!container) throw new Error('Render container not found');

        // Clear previous
        container.innerHTML = '';

        // Create a shadow wrapper
        const wrapper = document.createElement('div');

        // Parse HTML to extract styles and body
        const parser = new DOMParser();
        const doc = parser.parseFromString(targetCode, 'text/html');

        // Extract all <style> tags and <link> tags
        const styles = doc.querySelectorAll('style');
        const links = doc.querySelectorAll('link[rel="stylesheet"]');

        // Inject styles and links directly into document.head for global availability
        styles.forEach(style => {
          const cloned = style.cloneNode(true) as HTMLStyleElement;
          cloned.setAttribute('data-injected', 'true');
          
          let cssText = style.innerHTML;
          // Scopes body/html tags to avoid styles leaking into React app
          cssText = cssText.replace(/\bbody\b/g, '.slide-body-mock');
          cssText = cssText.replace(/\bhtml\b/g, '.slide-body-mock');
          
          cloned.innerHTML = cssText;
          document.head.appendChild(cloned);
        });

        links.forEach(link => {
          const cloned = link.cloneNode(true) as HTMLLinkElement;
          cloned.setAttribute('data-injected', 'true');
          document.head.appendChild(cloned);
        });

        // Get slide elements from parsed HTML
        const slides = doc.querySelectorAll('.slide');

        if (slides.length === 0) {
          throw new Error('No elements with class "slide" found in your HTML. Make sure your slide containers have class="slide".');
        }

        const renderedNodes: HTMLElement[] = [];

        slides.forEach((slide, index) => {
          const slideClone = slide.cloneNode(true) as HTMLElement;
          slideClone.id = `render-slide-${index}-inner`;
          
          // Bypass hidden slide styles by adding standard activation classes
          slideClone.classList.add('active', 'show', 'visible', 'current');
          if (slideClone.style.display === 'none') {
            slideClone.style.display = '';
          }
          
          // Inject custom branding if enabled
          if (enableBranding) {
            const handleText = instaHandle.trim() 
              ? (instaHandle.startsWith('@') ? instaHandle : `@${instaHandle}`)
              : null;

            // 1. Target standard simple .watermark classes
            const watermarks = slideClone.querySelectorAll('.watermark');
            watermarks.forEach(watermark => {
              (watermark as HTMLElement).style.opacity = '1';
              const finalHandle = handleText || '@yourusername';
              
              watermark.innerHTML = `
                <div style="display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 10px 20px; background: rgba(0, 0, 0, 0.65); border-radius: 12px; border: 1.5px solid rgba(255, 255, 255, 0.15); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); color: #ffffff; text-align: center; vertical-align: middle; box-shadow: 0 8px 32px rgba(0,0,0,0.25);">
                  ${avatarUrl ? `<img src="${avatarUrl}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 1.5px solid rgba(255,255,255,0.25); flex-shrink: 0;" />` : ''}
                  <span style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px; text-transform: none; font-family: 'Inter', sans-serif;">${finalHandle}</span>
                  ${showVerified ? `
                    <svg viewBox="0 0 24 24" width="22" height="22" style="flex-shrink: 0; fill: #0095f6; display: inline-block; vertical-align: middle; margin-left: 2px;">
                      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.488 0-.95.1-1.37.28C14.73 2.5 13.435 1.5 12 1.5s-2.73 1-3.402 2.29c-.42-.18-.882-.28-1.37-.28C5.12 3.51 3.41 5.29 3.41 7.5c0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.488 0 .95-.1 1.37-.28.672 1.29 1.967 2.29 3.402 2.29s2.73-1 3.402-2.29c.42.18.882.28 1.37.28 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.5 4l-4-4 1.41-1.41L10 13.67l6.59-6.59 1.41 1.41-8 8z" />
                    </svg>
                  ` : ''}
                </div>
              `;
            });

            // 2. Target custom .fname and .brand-name classes for Display Name
            if (displayName.trim()) {
              const names = slideClone.querySelectorAll('.fname, .brand-name');
              names.forEach(nameEl => {
                const originalBadge = nameEl.querySelector('.vbadge, .verified-badge');
                nameEl.innerHTML = displayName.trim();
                if (showVerified && originalBadge) {
                  nameEl.appendChild(originalBadge);
                }
              });
            }

            // 3. Target custom .fhandle, .brand-handle and .cta-handle classes
            const handles = slideClone.querySelectorAll('.fhandle, .brand-handle, .cta-handle');
            handles.forEach(handleEl => {
              if (handleText) {
                if (handleEl.classList.contains('cta-handle')) {
                  handleEl.textContent = `Follow ${handleText}`;
                } else {
                  handleEl.textContent = handleText;
                }
              }
            });

            // 4. Target custom .avatar and .brand-avatar classes
            const avatars = slideClone.querySelectorAll('.avatar, .brand-avatar');
            avatars.forEach(avatarEl => {
              if (avatarUrl) {
                avatarEl.innerHTML = `<img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;" />`;
              }
            });

            // 5. Target .vbadge and .verified-badge elements
            const badges = slideClone.querySelectorAll('.vbadge, .verified-badge');
            badges.forEach(badge => {
              (badge as HTMLElement).style.display = showVerified ? 'inline-flex' : 'none';
            });

            // 6. Append verified badge to name if it's not present
            if (showVerified && badges.length === 0) {
              const names = slideClone.querySelectorAll('.fname, .brand-name');
              names.forEach(nameEl => {
                if (!nameEl.querySelector('svg') && !nameEl.querySelector('.vbadge') && !nameEl.querySelector('.verified-badge')) {
                  const verifiedSpan = document.createElement('span');
                  verifiedSpan.className = 'verified-badge';
                  verifiedSpan.style.cssText = 'width: 14px; height: 14px; background: #1DA1F2; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; margin-left: 4px;';
                  verifiedSpan.innerHTML = `<svg viewBox="0 0 8 8" fill="none" style="width: 8px; height: 8px;"><path d="M1 4L3 6L7 2" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                  nameEl.appendChild(verifiedSpan);
                }
              });
            }

            // 7. Apply a premium glassmorphic dark background container for `.footer`, `.brand-footer`, and `.s8-footer`
            const footers = slideClone.querySelectorAll('.footer, .brand-footer, .s8-footer');
            footers.forEach(footerEl => {
              const f = footerEl as HTMLElement;
              f.style.background = 'rgba(0, 0, 0, 0.65)';
              f.style.backdropFilter = 'blur(10px)';
              f.style.webkitBackdropFilter = 'blur(10px)';
              f.style.borderRadius = '12px';
              f.style.border = '1px solid rgba(255, 255, 255, 0.12)';
              f.style.padding = '12px 18px';
              f.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
              
              // Force text elements inside the glass box to remain white & legible
              const textElements = f.querySelectorAll('.fname, .brand-name, .fhandle, .brand-handle, .cta-handle');
              textElements.forEach(textEl => {
                const t = textEl as HTMLElement;
                if (t.classList.contains('fhandle') || t.classList.contains('brand-handle')) {
                  t.style.setProperty('color', 'rgba(255, 255, 255, 0.6)', 'important');
                } else {
                  t.style.setProperty('color', '#ffffff', 'important');
                }
              });
            });
          }

          // Let native CSS dimensions apply
          slideClone.style.position = 'relative';
          slideClone.style.overflow = 'hidden';
          slideClone.style.flexShrink = '0';

          // Wrap the slide inside a slide-body-mock container to match scoped styles
          const slideWrapper = document.createElement('div');
          slideWrapper.className = 'slide-body-mock';
          slideWrapper.id = `render-slide-${index}`;
          slideWrapper.style.position = 'relative';
          slideWrapper.style.overflow = 'hidden';
          slideWrapper.style.flexShrink = '0';
          slideWrapper.appendChild(slideClone);

          wrapper.appendChild(slideWrapper);
          renderedNodes.push(slideWrapper);
        });

        container.appendChild(wrapper);

        // Dynamically measure layout dimensions of the first parsed slide
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.visibility = 'hidden';
        
        // Clone slide wrapper node for measurement
        const firstClone = renderedNodes[0].cloneNode(true) as HTMLElement;
        tempContainer.appendChild(firstClone);
        document.body.appendChild(tempContainer);

        // Find the inner .slide element for accurate sizing metrics
        const measuredInner = firstClone.querySelector('.slide') as HTMLElement;
        const measuredWidth = measuredInner?.offsetWidth || 1080;
        const measuredHeight = measuredInner?.offsetHeight || 1350;

        setSlideWidth(measuredWidth);
        setSlideHeight(measuredHeight);

        // Set dimensions on the wrappers to contain the layout correctly
        renderedNodes.forEach((node) => {
          node.style.width = `${measuredWidth}px`;
          node.style.height = `${measuredHeight}px`;
        });

        document.body.removeChild(tempContainer);

        // Wait for fonts/images to load
        setTimeout(() => {
          setSlideNodes(renderedNodes);
          setSelectedSlide(0);
          setIsProcessing(false);
          // Auto switch to brand tab so they can see the settings instantly!
          setActiveTab('brand');
        }, 500);

      } catch (err: any) {
        setError(err.message || 'Failed to parse HTML');
        setIsProcessing(false);
      }
    }, 100);
  }, [htmlCode, enableBranding, displayName, instaHandle, avatarUrl, showVerified, activeTab]);

  // Live reload slides when branding changes to keep preview synced
  useEffect(() => {
    if (htmlCode.trim() && slideNodes.length > 0) {
      parseAndRender();
    }
  }, [enableBranding, displayName, instaHandle, avatarUrl, showVerified]);

  const handleExportSingle = async (index: number) => {
    if (slideNodes.length === 0 || isExporting) return;
    setIsExporting(true);
    try {
      const filename = `${instaHandle.trim() ? instaHandle.replace('@', '') : 'slide'}-${String(index + 1).padStart(2, '0')}`;
      await exportNodeAsImage(slideNodes[index], filename, exportFormat);
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
    parseAndRender(SAMPLE_HTML); // Auto parse sample!
  };

  const handleClear = () => {
    setHtmlCode('');
    setSlideNodes([]);
    setSelectedSlide(0);
    setError(null);
    if (renderContainerRef.current) {
      renderContainerRef.current.innerHTML = '';
    }
    // Clean up injected styles
    document.querySelectorAll('[data-injected="true"]').forEach(el => el.remove());
    setActiveTab('code');
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
        const code = event.target?.result as string;
        setHtmlCode(code);
        parseAndRender(code); // AUTO PARSE INSTANTLY ON DROP!
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
      const code = event.target?.result as string;
      setHtmlCode(code);
      parseAndRender(code); // AUTO PARSE INSTANTLY ON UPLOAD!
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

  // Canvas Scaling calculations
  const centerpieceHeight = 500;
  const centerpieceScale = centerpieceHeight / slideHeight;
  const centerpieceWidth = slideWidth * centerpieceScale;

  const thumbHeight = 60;
  const thumbScale = thumbHeight / slideHeight;
  const thumbWidth = slideWidth * thumbScale;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col overflow-hidden">
      {/* Hidden render container */}
      <div id="render-container" ref={renderContainerRef} />

      {/* Premium Minimalist Header */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-zinc-950/85 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
            <span className="text-zinc-950 text-[10px] font-black tracking-tighter">IC</span>
          </div>
          <h1 className="text-xs font-semibold tracking-[0.2em] text-white uppercase font-display">
            InstaCarousel Workbench
          </h1>
        </div>
        
        {slideNodes.length > 0 && (
          <div className="flex items-center gap-4 animate-fadeIn">
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold bg-white/5 border border-white/10 px-2.5 py-1 rounded-md">
              {slideNodes.length} Slides Loaded ({slideWidth}x{slideHeight}px)
            </span>
            <button
              onClick={handleClear}
              className="text-[10px] uppercase tracking-wider text-red-400 hover:text-red-300 font-semibold border border-red-500/20 bg-red-500/5 px-2.5 py-1 rounded-md transition-colors"
            >
              Reset
            </button>
          </div>
        )}
      </header>

      {/* Main Workbench Layout */}
      <main className="flex-1 flex h-[calc(100vh-56px)] overflow-hidden relative">

        {/* Left Control Panel / Sidebar */}
        <section className="w-80 border-r border-white/5 bg-zinc-950 flex flex-col h-full z-20 flex-shrink-0">
          
          {/* Custom Tab Selector */}
          <div className="flex border-b border-white/5 p-1 bg-zinc-950/50">
            {(['code', 'brand', 'export'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                  activeTab === tab
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content Container */}
          <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
            
            {/* CODE TAB */}
            {activeTab === 'code' && (
              <div className="space-y-5 h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">HTML Core Source</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 border border-white/5 transition-all"
                      title="Upload HTML File"
                    >
                      <Upload className="w-3.5 h-3.5" />
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
                      className="text-[9px] uppercase tracking-wider px-2 py-1.5 rounded-lg text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/5 transition-all font-semibold"
                    >
                      Sample
                    </button>
                  </div>
                </div>

                {/* Code Textarea with Drag & Drop */}
                <div className="relative flex-1 min-h-[280px] border border-white/5 rounded-xl overflow-hidden bg-black/40">
                  <textarea
                    value={htmlCode}
                    onChange={(e) => setHtmlCode(e.target.value)}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    placeholder={`Paste code here or drag & drop HTML file...\n\nUses class="slide" (1080×1350px or 360x450px).\n\nWatermarks, handles & avatar logos are replaced dynamically!`}
                    className={cn(
                      "w-full h-full bg-transparent text-[11px] text-zinc-400 placeholder:text-zinc-700 p-4 focus:outline-none transition-all duration-200 resize-none font-mono leading-relaxed",
                      isDragging && "bg-white/[0.02]"
                    )}
                    spellCheck={false}
                  />
                  {isDragging && (
                    <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none border border-dashed border-white/20 rounded-xl">
                      <Upload className="w-5 h-5 text-white mb-1.5 animate-bounce" />
                      <p className="text-[10px] text-white uppercase tracking-widest font-semibold">Drop to Import HTML</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => parseAndRender()}
                  disabled={!htmlCode.trim() || isProcessing}
                  className="w-full bg-white text-zinc-950 hover:bg-zinc-200 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:border-zinc-800 border border-white/10 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 mt-auto"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Rendering...
                    </>
                  ) : (
                    <>
                      <Code2 className="w-3.5 h-3.5" />
                      Generate Slides
                    </>
                  )}
                </button>
              </div>
            )}

            {/* BRANDING TAB */}
            {activeTab === 'brand' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">Dynamic Brand Override</h3>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Inject handles dynamically inside slides.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={enableBranding} 
                      onChange={(e) => setEnableBranding(e.target.checked)} 
                      className="sr-only peer" 
                    />
                    <div className="w-8 h-4.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-white"></div>
                  </label>
                </div>

                {!enableBranding ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Settings className="w-8 h-8 text-zinc-700 mb-3" />
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Branding is Disabled</p>
                    <p className="text-[9px] text-zinc-600 max-w-[200px]">
                      Enable custom branding to auto-replace the logo/avatar, verified badge, and handle name.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5 animate-fadeIn">
                    
                    {/* Avatar Upload */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Channel Logo</label>
                      <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                        <div className="relative w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-zinc-500" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <label className="inline-flex items-center justify-center px-3 py-1.5 border border-white/10 rounded-lg text-[10px] font-bold text-white/70 hover:bg-white/5 cursor-pointer transition-all w-full text-center uppercase tracking-wider">
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
                              className="block text-[8px] text-red-400/80 hover:text-red-400 text-center w-full uppercase tracking-wider font-bold transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Display Name */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Display Name</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Financial Singh"
                        className="w-full bg-black/40 border border-white/5 focus:border-white/20 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none placeholder:text-zinc-700 transition-colors"
                      />
                    </div>

                    {/* Instagram Handle */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Handle Name</label>
                      <input
                        type="text"
                        value={instaHandle}
                        onChange={(e) => setInstaHandle(e.target.value)}
                        placeholder="@yourusername"
                        className="w-full bg-black/40 border border-white/5 focus:border-white/20 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none placeholder:text-zinc-700 transition-colors"
                      />
                    </div>

                    {/* Verified Badge Checkbox */}
                    <div className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/5 rounded-xl">
                      <div className="flex items-center gap-2">
                        <svg viewBox="0 0 24 24" width="16" height="16" style={{ fill: '#0095f6' }}>
                          <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.488 0-.95.1-1.37.28C14.73 2.5 13.435 1.5 12 1.5s-2.73 1-3.402 2.29c-.42-.18-.882-.28-1.37-.28C5.12 3.51 3.41 5.29 3.41 7.5c0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.488 0 .95-.1 1.37-.28.672 1.29 1.967 2.29 3.402 2.29s2.73-1 3.402-2.29c.42.18.882.28 1.37.28 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.5 4l-4-4 1.41-1.41L10 13.67l6.59-6.59 1.41 1.41-8 8z" />
                        </svg>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Verified Badge</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={showVerified} 
                          onChange={(e) => setShowVerified(e.target.checked)} 
                          className="sr-only peer" 
                        />
                        <div className="w-8 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-500"></div>
                      </label>
                    </div>

                    {/* Live Watermark Preview Inside Sidebar */}
                    <div className="p-3 border border-white/5 bg-black/40 rounded-xl space-y-2">
                      <label className="block text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Live Watermark Preview</label>
                      <div className="flex items-center justify-center p-2 bg-zinc-950 border border-white/5 rounded-lg text-white/50 text-xs">
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {avatarUrl ? (
                            <img src={avatarUrl} style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                          ) : (
                            <div className="w-[18px] h-[18px] rounded-full bg-white/10 flex items-center justify-center"><User className="w-2.5 h-2.5 text-white/30" /></div>
                          )}
                          <span style={{ fontWeight: 700, fontSize: '11px', color: '#fff' }}>
                            {instaHandle.trim() ? (instaHandle.startsWith('@') ? instaHandle : `@${instaHandle}`) : '@yourusername'}
                          </span>
                          {showVerified && (
                            <svg viewBox="0 0 24 24" width="12" height="12" style={{ fill: '#0095f6' }}>
                              <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.488 0-.95.1-1.37.28C14.73 2.5 13.435 1.5 12 1.5s-2.73 1-3.402 2.29c-.42-.18-.882-.28-1.37-.28C5.12 3.51 3.41 5.29 3.41 7.5c0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.488 0 .95-.1 1.37-.28.672 1.29 1.967 2.29 3.402 2.29s2.73-1 3.402-2.29c.42.18.882.28 1.37.28 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.5 4l-4-4 1.41-1.41L10 13.67l6.59-6.59 1.41 1.41-8 8z" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* EXPORT TAB */}
            {activeTab === 'export' && (
              <div className="space-y-6">
                
                {slideNodes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <FolderDown className="w-8 h-8 text-zinc-700 mb-3" />
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">No Slides Loaded</p>
                    <p className="text-[9px] text-zinc-600 max-w-[200px]">
                      Generate your slides first in the "Code" tab to configure export properties.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5 animate-fadeIn">
                    
                    {/* Format Toggle */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Image Format</label>
                      <div className="flex bg-black/40 border border-white/5 rounded-xl p-1 justify-between items-center">
                        <span className="text-xs text-zinc-400 px-3">Export File Format</span>
                        <div className="flex bg-white/5 rounded-lg p-0.5">
                          <button
                            onClick={() => setExportFormat('png')}
                            className={cn(
                              'px-3 py-1.5 text-[10px] font-bold rounded-md transition-all uppercase tracking-wider',
                              exportFormat === 'png' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                            )}
                          >PNG</button>
                          <button
                            onClick={() => setExportFormat('jpg')}
                            className={cn(
                              'px-3 py-1.5 text-[10px] font-bold rounded-md transition-all uppercase tracking-wider',
                              exportFormat === 'jpg' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                            )}
                          >JPG</button>
                        </div>
                      </div>
                    </div>

                    {/* Single Slide Export List */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Export Individual Slides</label>
                      <div className="max-h-[220px] overflow-y-auto border border-white/5 bg-black/40 rounded-xl divide-y divide-white/5 scrollbar-hide">
                        {slideNodes.map((_, index) => (
                          <div key={index} className="flex items-center justify-between p-3.5 hover:bg-white/[0.02] transition-colors">
                            <span className="text-[11px] font-semibold text-zinc-300">Slide {String(index + 1).padStart(2, '0')}</span>
                            <button
                              onClick={() => handleExportSingle(index)}
                              disabled={isExporting || isExportingAll}
                              className="text-[10px] px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white text-zinc-300 font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-40"
                            >
                              <Download className="w-3 h-3" /> Save
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Export All Zip Button */}
                    <button
                      onClick={handleExportAll}
                      disabled={isExporting || isExportingAll}
                      className="w-full bg-white text-zinc-950 hover:bg-zinc-200 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:border-zinc-800 border border-white/10 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 mt-4 shadow-xl shadow-white/5"
                    >
                      {isExportingAll ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Zipping {exportProgress.current}/{exportProgress.total}...
                        </>
                      ) : (
                        <>
                          <Archive className="w-3.5 h-3.5" />
                          Download All (ZIP)
                        </>
                      )}
                    </button>

                  </div>
                )}
              </div>
            )}

          </div>

          {/* Unified Sidebar Footer Status */}
          <div className="p-4 border-t border-white/5 text-[9px] uppercase tracking-widest text-zinc-600 text-center font-bold">
            Status: Fully Live & Connected
          </div>

        </section>

        {/* Right Workspace Canvas */}
        <section className="flex-1 bg-grid bg-zinc-900/10 flex flex-col items-center justify-center p-8 overflow-hidden relative">

          {/* Empty State when no slides loaded */}
          {slideNodes.length === 0 && !isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center max-w-sm text-center bg-zinc-950/80 border border-white/5 rounded-2xl p-8 backdrop-blur-md shadow-2xl z-10"
            >
              <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center mb-4 text-zinc-400 bg-white/5">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <h2 className="text-sm font-semibold text-white uppercase tracking-[0.2em] font-display mb-1">
                InstaCarousel Canvas
              </h2>
              <p className="text-[11px] text-zinc-500 leading-relaxed mb-5">
                Import your Instagram HTML slide code. The tool will parse each slide at its designed portrait ratio ready for exporting.
              </p>
              <div className="flex gap-3 justify-center w-full">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 text-[10px] uppercase tracking-widest font-bold py-2 rounded-xl text-white border border-white/10 hover:bg-white/5 transition-all"
                >
                  Browse File
                </button>
                <button
                  onClick={loadSample}
                  className="flex-1 text-[10px] uppercase tracking-widest font-bold py-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 transition-all"
                >
                  Load Sample
                </button>
              </div>
            </motion.div>
          )}

          {/* Rendering Skeleton during parse */}
          {isProcessing && (
            <div className="flex flex-col items-center justify-center z-10">
              <Loader2 className="w-8 h-8 text-zinc-400 animate-spin mb-4" />
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Assembling Slide Matrix...</p>
            </div>
          )}

          {/* Error Message banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-6 left-6 right-6 z-40 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold backdrop-blur-md"
              >
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400 transition-colors">✕</button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* IMMERSIVE CANVAS WORKSPACE */}
          {slideNodes.length > 0 && !isProcessing && (
            <div className="w-full h-full flex flex-col items-center justify-center relative animate-fadeIn">
              
              {/* Scaled Active Slide Centerpiece */}
              <div className="relative flex items-center justify-center w-full flex-1">
                
                {/* Floating Left Page Arrow */}
                <button
                  onClick={() => setSelectedSlide(prev => Math.max(0, prev - 1))}
                  disabled={selectedSlide === 0}
                  className="absolute left-10 p-3 rounded-full bg-zinc-950/80 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-900 hover:scale-105 disabled:opacity-0 disabled:pointer-events-none transition-all shadow-xl z-30"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Main Dynamic Instagram Canvas Container */}
                <div 
                  className="shadow-[0_30px_100px_-20px_rgba(0,0,0,0.85)] border border-white/10 rounded-2xl overflow-hidden relative bg-black transition-all duration-300 transform"
                  style={{ width: `${centerpieceWidth}px`, height: `${centerpieceHeight}px` }}
                >
                  {/* CSS Hard-Scaled Dynamic Node Rendering */}
                  <div 
                    dangerouslySetInnerHTML={{ __html: slideNodes[selectedSlide].outerHTML }} 
                    className="origin-top-left pointer-events-none absolute inset-0 bg-white"
                    style={{ 
                      width: `${slideWidth}px`, 
                      height: `${slideHeight}px`,
                      transform: `scale(${centerpieceScale})`
                    }}
                  />
                </div>

                {/* Floating Right Page Arrow */}
                <button
                  onClick={() => setSelectedSlide(prev => Math.min(slideNodes.length - 1, prev + 1))}
                  disabled={selectedSlide === slideNodes.length - 1}
                  className="absolute right-10 p-3 rounded-full bg-zinc-950/80 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-900 hover:scale-105 disabled:opacity-0 disabled:pointer-events-none transition-all shadow-xl z-30"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

              </div>

              {/* Sleek Floating Centerpiece Control Toolbar */}
              <div className="bg-zinc-950/90 border border-white/5 backdrop-blur-xl rounded-2xl py-3 px-5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex items-center justify-between gap-6 w-fit min-w-[460px] z-30 mb-8 mt-2 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black tracking-widest text-zinc-400 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10">
                    SLIDE {String(selectedSlide + 1).padStart(2, '0')} / {String(slideNodes.length).padStart(2, '0')}
                  </span>
                </div>

                <div className="h-4 w-px bg-white/10" />

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportSingle(selectedSlide)}
                    disabled={isExporting || isExportingAll}
                    className="text-[10px] font-bold uppercase tracking-wider py-1.5 px-3.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 transition-all flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 cursor-pointer"
                  >
                    <Download className="w-3 h-3" /> Export Current
                  </button>
                  <button
                    onClick={handleExportAll}
                    disabled={isExporting || isExportingAll}
                    className="text-[10px] font-bold uppercase tracking-wider py-1.5 px-3.5 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 cursor-pointer"
                  >
                    {isExportingAll ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        ZIP ({exportProgress.current}/{exportProgress.total})
                      </>
                    ) : (
                      <>
                        <Archive className="w-3 h-3" /> Download ZIP
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Floating Slide Thumbnail Strip Carousel */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-950/80 border border-white/5 backdrop-blur-xl rounded-2xl py-2 px-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-2 max-w-[80%] overflow-x-auto scrollbar-hide z-30">
                {slideNodes.map((node, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedSlide(index)}
                    className={cn(
                      "rounded-lg border-2 overflow-hidden flex-shrink-0 cursor-pointer transition-all duration-300 relative bg-black",
                      index === selectedSlide
                        ? "border-white scale-[1.05]"
                        : "border-transparent opacity-40 hover:opacity-80"
                    )}
                    style={{ width: `${thumbWidth}px`, height: `${thumbHeight}px` }}
                  >
                    {/* Tiny scaled micro-thumbnail */}
                    <div 
                      dangerouslySetInnerHTML={{ __html: node.outerHTML }} 
                      className="origin-top-left pointer-events-none absolute inset-0 bg-white"
                      style={{ 
                        width: `${slideWidth}px`, 
                        height: `${slideHeight}px`,
                        transform: `scale(${thumbScale})`
                      }}
                    />
                  </div>
                ))}
              </div>

            </div>
          )}

        </section>

      </main>
    </div>
  );
};

export default App;
