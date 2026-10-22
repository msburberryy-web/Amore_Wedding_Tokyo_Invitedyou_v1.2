import React, { useState, useEffect } from 'react';
import { WeddingData } from '../types';

interface Props {
  data: WeddingData;
  onOpen: () => void;
}

type AnimationStage = 'closed' | 'opening' | 'extracting' | 'zooming' | 'revealing' | 'finished';

const EnvelopeOverlay: React.FC<Props> = ({ data, onOpen }) => {
  const [stage, setStage] = useState<AnimationStage>('closed');
  const [sealPressed, setSealPressed] = useState(false);
  // Opt-in painterly variant: deep blue envelope + gold monogram/seal instead of the default cream paper.
  const hasArt = !!data.images?.pageBackground;

  const playPaperSound = () => {
      const audio = new Audio('https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3'); 
      //const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2414/2414-preview.mp3'); 
      audio.volume = 0.5;
      audio.play().catch(() => {});
  };

  const startSequence = () => {
    if (stage !== 'closed') return;
    playPaperSound();
    setStage('opening');
    document.body.style.overflow = '';
    setTimeout(() => setStage('extracting'), 400);
    setTimeout(() => setStage('zooming'), 1400);
    setTimeout(() => {
        setStage('revealing');
        onOpen(); 
    }, 2400); 
    setTimeout(() => setStage('finished'), 3500); 
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleWheel = (e: WheelEvent) => { if (stage === 'closed' && Math.abs(e.deltaY) > 5) startSequence(); };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel);
      document.body.style.overflow = '';
    };
  }, [stage]);

  if (stage === 'finished') return null;

  const isOpeningOrLater = stage !== 'closed';
  const isExtractingOrLater = ['extracting', 'zooming', 'revealing', 'finished'].includes(stage);
  const isZoomingOrLater = ['zooming', 'revealing', 'finished'].includes(stage);
  const isRevealing = stage === 'revealing';
  const flapZIndex = isExtractingOrLater ? 1 : 30;
  // The 4-flap art variant takes longer to fully clear (staggered delays up to 300ms + 900ms
  // transition ≈ 1200ms) than the default single-flap variant's drop point (400ms), so it needs
  // its own, later z-index drop — otherwise the reveal card would cover the flaps mid-animation.
  const artFlapZIndex = isZoomingOrLater ? 1 : 30;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-1000 ease-in-out ${isRevealing ? 'opacity-0 pointer-events-none' : 'opacity-100 bg-stone-900/90 backdrop-blur-sm'} ${hasArt ? 'p-0' : 'p-4'}`}
      style={{ touchAction: 'none' }}
      onClick={startSequence}
    >
      <div className={hasArt ? 'relative w-full h-full' : 'relative w-full max-w-lg perspective-1000'} style={hasArt ? { perspective: '1600px' } : undefined}>
        {hasArt ? (
          // Full-screen folded-paper variant: no envelope silhouette — 4 triangular flaps meeting at
          // center (clip-path, not a literal envelope outline), a real wax-seal image as the open
          // button, and the same shared reveal-card below. Flaps fold away via 3D rotation (each
          // past 90°, backface-hidden, so it simply vanishes rather than showing a mirrored back) in
          // a staggered order (top, then sides, then bottom) purely via CSS transition-delay — the
          // underlying open/closed state is still just the existing stage machine, unchanged.
          // IMPORTANT: perspective lives on the shared parent above, not here — a `perspective`
          // value on this div would establish its own nested stacking context (per spec, same as
          // `transform`), trapping the flaps' z-index inside it and letting the reveal-card sibling
          // (explicit z-index: 10, in the outer context) paint over the whole thing regardless of
          // the flaps' z-index: 30 — that was the actual bug behind "I don't see the envelope at all".
          <div className={`absolute inset-0 transition-all duration-1000 ease-in-out ${isZoomingOrLater ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute inset-0 z-0" style={{ backgroundColor: '#1F2D52' }} />
            {([
              { clip: 'polygon(0 0, 100% 0, 50% 50%)', origin: 'top center', openT: 'rotateX(-175deg)', delay: '0ms' },
              { clip: 'polygon(0 100%, 100% 100%, 50% 50%)', origin: 'bottom center', openT: 'rotateX(175deg)', delay: '300ms' },
              { clip: 'polygon(0 0, 50% 50%, 0 100%)', origin: 'left center', openT: 'rotateY(175deg)', delay: '120ms' },
              { clip: 'polygon(100% 0, 100% 100%, 50% 50%)', origin: 'right center', openT: 'rotateY(-175deg)', delay: '120ms' },
            ] as const).map((flap, i) => (
              <div
                key={i}
                className="absolute inset-0 transition-transform duration-[900ms]"
                style={{
                  zIndex: artFlapZIndex,
                  clipPath: flap.clip,
                  transformOrigin: flap.origin,
                  transformStyle: 'preserve-3d',
                  backfaceVisibility: 'hidden',
                  transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                  transitionDelay: isOpeningOrLater ? flap.delay : '0ms',
                  transform: isOpeningOrLater ? flap.openT : 'rotateX(0deg) rotateY(0deg)',
                  backgroundColor: '#1F2D52',
                  backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(255,214,140,0.1), transparent 35%), radial-gradient(circle at 70% 75%, rgba(255,214,140,0.08), transparent 30%)',
                }}
              />
            ))}
            {/* Gold crease lines tracing where the 4 flaps meet — without this, all 4 panels are the
                exact same flat color with no border, so the fold is invisible and opening them just
                looks like a hard cut straight to the content underneath. Fades out as flaps open. */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-[1100ms] ${isOpeningOrLater ? 'opacity-0' : 'opacity-70'}`}
              style={{ zIndex: artFlapZIndex + 1 }}
            >
              <line x1="0" y1="0" x2="50" y2="50" stroke="#D1A054" strokeWidth="0.3" />
              <line x1="100" y1="0" x2="50" y2="50" stroke="#D1A054" strokeWidth="0.3" />
              <line x1="0" y1="100" x2="50" y2="50" stroke="#D1A054" strokeWidth="0.3" />
              <line x1="100" y1="100" x2="50" y2="50" stroke="#D1A054" strokeWidth="0.3" />
            </svg>
            <div className={`absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 pointer-events-none transition-opacity duration-300 ${isOpeningOrLater ? 'opacity-0' : 'opacity-100'}`}>
              <img
                src="./photos/khant_aye/wax-seal.png"
                alt="Open invitation"
                onMouseDown={() => setSealPressed(true)}
                onMouseUp={() => setSealPressed(false)}
                onMouseLeave={() => setSealPressed(false)}
                onTouchStart={() => setSealPressed(true)}
                onTouchEnd={() => setSealPressed(false)}
                className={`pointer-events-auto cursor-pointer w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 drop-shadow-2xl transition-transform duration-150 ${sealPressed ? 'scale-90' : 'scale-100 animate-pulse'}`}
              />
              <span className="text-wedding-gold/90 text-[10px] tracking-[0.3em] uppercase font-serif">Open Invitation</span>
            </div>
          </div>
        ) : (
        <div className={`relative w-full aspect-[1.5] transition-all duration-1000 ease-in-out ${isZoomingOrLater ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute inset-0 rounded-sm shadow-2xl overflow-hidden z-0 border border-[#e6e2d8]" style={{ backgroundColor: '#f3f0e9' }}>
                <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/paper.png')]"></div>
            </div>
            <div className="absolute inset-0 z-20 pointer-events-none filter drop-shadow-md">
                <svg viewBox="0 0 300 200" className="w-full h-full" preserveAspectRatio="none">
                    <path d="M0,0 L140,110 L0,200 Z" fill="#e6e2d8" />
                    <path d="M300,0 L160,110 L300,200 Z" fill="#e6e2d8" />
                    <path d="M0,200 L150,90 L300,200 Z" fill="#ece8df" />
                    <path d="M0,200 L150,90 L300,200" fill="none" stroke="#dcd8cc" strokeWidth="1" />
                </svg>
            </div>
            <div
                className="absolute top-0 left-0 right-0 h-1/2 origin-top transition-transform duration-[800ms] ease-in-out"
                style={{ zIndex: flapZIndex, transformStyle: 'preserve-3d', transform: isOpeningOrLater ? 'rotateX(180deg)' : 'rotateX(0deg)' }}
            >
                 <div className="absolute inset-0 backface-hidden" style={{ backfaceVisibility: 'hidden' }}>
                     <svg viewBox="0 0 300 100" className="w-full h-full" preserveAspectRatio="none"><path d="M0,0 L150,110 L300,0 Z" fill="#dcd8cc" /></svg>
                     <div className={`absolute top-[90%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 transition-opacity duration-300 ${isOpeningOrLater ? 'opacity-0' : 'opacity-100'}`}>
                        <div className="relative group cursor-pointer animate-pulse">
                            <div className="w-16 h-16 bg-[#8a1c1c] rounded-full border-4 border-[#701515] shadow-lg flex items-center justify-center">
                                <span className="text-white/90 font-serif italic font-bold text-sm">Open</span>
                            </div>
                        </div>
                     </div>
                 </div>
                 <div className="absolute inset-0 backface-hidden" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: '#f3f0e9', clipPath: 'polygon(0 0, 50% 100%, 100% 0)' }}>
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/paper.png')]"></div>
                 </div>
            </div>
         </div>
        )}

         <div
            className={`shadow-lg rounded flex flex-col items-center justify-center text-center z-10 transition-all duration-[1000ms] cubic-bezier(0.4, 0, 0.2, 1) ${hasArt ? 'bg-[#1F2D52]' : 'bg-[#FDFBF7]'} ${isZoomingOrLater ? 'fixed inset-0 w-screen h-screen z-[1000] scale-100 rounded-none' : 'absolute left-4 right-4 top-4 bottom-4'}`}
            style={{ transform: !isZoomingOrLater && isExtractingOrLater ? 'translateY(-60%)' : 'translateY(0)', zIndex: isZoomingOrLater ? 100 : 10 }}
         >
            <div className={`w-full h-full flex flex-col items-center justify-center border border-wedding-gold/30 p-4 md:p-8 transition-opacity duration-500 ${isRevealing ? 'opacity-0' : 'opacity-100'}`}>
                <p className="text-wedding-gold text-[10px] md:text-xs tracking-[0.4em] uppercase mb-6 md:mb-8">Invitation</p>
                <h2 className={`font-serif text-xl sm:text-2xl md:text-3xl mb-3 md:mb-4 uppercase tracking-[0.15em] md:tracking-[0.3em] font-light break-words w-full px-2 ${hasArt ? 'text-[#F6EFE1]' : 'text-gray-800'}`}>{data.groomName.en}</h2>
                <span className="text-base md:text-lg text-wedding-gold font-script italic mb-3 md:mb-4">&</span>
                <h2 className={`font-serif text-xl sm:text-2xl md:text-3xl mb-6 md:mb-8 uppercase tracking-[0.15em] md:tracking-[0.3em] font-light break-words w-full px-2 ${hasArt ? 'text-[#F6EFE1]' : 'text-gray-800'}`}>{data.brideName.en}</h2>
                <div className="w-12 h-[1px] bg-wedding-gold mb-4"></div>
                <p className={`text-[10px] md:text-xs font-serif uppercase tracking-widest ${hasArt ? 'text-[#D1A054]/80' : 'text-gray-500'}`}>{new Date(data.date).toLocaleDateString()}</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default EnvelopeOverlay;