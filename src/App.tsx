import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Code2, Image, Download, Archive, Loader2,
  Sparkles, ChevronLeft, ChevronRight, FileType, Trash2, Copy, Check
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
  const [copied, setCopied] = useState(false);

  const renderContainerRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  const parseAndRender = useCallback(() => {
    if (!htmlCode.trim()) {
      setError('Please paste your HTML code first.');
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
  }, [htmlCode]);

  const handleExportSingle = async () => {
    if (slideNodes.length === 0 || isExporting) return;
    setIsExporting(true);
    try {
      const filename = `slide-${String(selectedSlide + 1).padStart(2, '0')}`;
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
      await exportAllAsZip(slideNodes, 'carousel', exportFormat, (current, total) => {
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

  // Generate preview thumbnails from rendered slides using canvas
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  useEffect(() => {
    if (slideNodes.length === 0) {
      setThumbnails([]);
      return;
    }

    const generateThumbnails = async () => {
      const { toPng } = await import('html-to-image');
      const thumbs: string[] = [];

      for (const node of slideNodes) {
        try {
          const dataUrl = await toPng(node, {
            canvasWidth: 270,
            canvasHeight: 337,
            quality: 0.8,
            pixelRatio: 1,
            cacheBust: true,
            style: { transform: 'none' },
          });
          thumbs.push(dataUrl);
        } catch {
          thumbs.push('');
        }
      }
      setThumbnails(thumbs);
    };

    generateThumbnails();
  }, [slideNodes]);

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
                  HTML → Image
                </h1>
                <p className="text-[11px] text-white/30 -mt-0.5">Paste HTML • Export PNG/JPG</p>
              </div>
            </div>

            {slideNodes.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                  {slideNodes.length} slide{slideNodes.length !== 1 ? 's' : ''} detected
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* HTML Input Section */}
        <section className="mb-8">
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-medium text-white/60">HTML Code</span>
              </div>
              <div className="flex items-center gap-2">
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

            {/* Editor */}
            <textarea
              id="html-input"
              value={htmlCode}
              onChange={(e) => setHtmlCode(e.target.value)}
              placeholder={`Paste your full HTML code here...\n\nYour HTML should contain elements with class="slide" (1080×1350px).\nInclude all <style> tags and content inside.`}
              className="html-editor w-full bg-transparent text-white/80 placeholder:text-white/15 p-5 focus:outline-none"
              style={{ minHeight: '280px', maxHeight: '450px' }}
              spellCheck={false}
            />

            {/* Action Bar */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-white/5 bg-white/[0.02]">
              <p className="text-[11px] text-white/25">
                {htmlCode ? `${htmlCode.length.toLocaleString()} characters` : 'No code pasted'}
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
                    <Loader2 className="w-4 h-4 animate-spin-slow" />
                    Parsing...
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
                  {thumbnails.map((thumb, index) => (
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
                          'slide-thumb cursor-pointer rounded-xl overflow-hidden border-2',
                          index === selectedSlide
                            ? 'border-indigo-500 shadow-lg shadow-indigo-500/20'
                            : 'border-transparent hover:border-white/20'
                        )}
                        style={{ aspectRatio: '4/5' }}
                      >
                        {thumb ? (
                          <img src={thumb} alt={`Slide ${index + 1}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-white/5 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
                          </div>
                        )}
                      </div>
                      <p className="text-center text-xs text-white/30 mt-2 font-medium">
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
              Paste Your HTML
            </h2>
            <p className="text-sm text-white/20 text-center max-w-md mb-6">
              Paste your carousel HTML code above and click "Generate Slides".<br />
              Each element with <code className="text-indigo-400/60 bg-indigo-500/10 px-1.5 py-0.5 rounded text-xs">class="slide"</code> will become a 1080×1350 image.
            </p>
            <button
              onClick={loadSample}
              className="text-sm px-5 py-2.5 rounded-xl text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all"
            >
              Try with Sample HTML
            </button>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-xs text-white/20">
            HTML → Image Converter • 1080×1350 Instagram Carousel Export
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
