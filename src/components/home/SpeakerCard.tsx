import React from 'react';
import { Speaker } from '../../types';
import { Sparkles, BookCheck } from 'lucide-react';

interface SpeakerCardProps {
  speaker: Speaker;
  index: number;
}

export const SpeakerCard: React.FC<SpeakerCardProps> = ({ speaker, index }) => {
  const isSpeakerTwo = speaker.id === 'spk-2' || index === 1;
  const isSpeakerThree = speaker.id === 'spk-3' || index === 2;

  return (
    <div className="liquid-glass liquid-glass-hover p-4 sm:p-5 flex flex-col h-full bg-white/80 group">
      
      {/* 3:4 Vertical Image Frame (100% Untouched original ratio) */}
      <div
        className={`relative aspect-[3/4] w-full rounded-2xl overflow-hidden shadow-inner mb-4 flex items-center justify-center ${
          isSpeakerThree
            ? 'bg-[linear-gradient(180deg,#e1e3e3_0%,#ebeded_20%,#f1f1f1_45%,#f1f1f1_100%)]'
            : 'bg-gradient-to-b from-amber-100/60 to-orange-100/60'
        }`}
      >
        {/* Soft background glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-orange-950/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />
        
        {/* The 100% untouched speaker video / portrait */}
        {speaker.videoUrl || speaker.imageUrl.endsWith('.mp4') || speaker.imageUrl.endsWith('.webm') ? (
          <video
            key={speaker.videoUrl || speaker.imageUrl}
            src={speaker.videoUrl || speaker.imageUrl}
            autoPlay
            loop
            muted
            playsInline
            onLoadedMetadata={(e) => {
              e.currentTarget.muted = true;
              e.currentTarget.volume = 0;
            }}
            onPlay={(e) => {
              e.currentTarget.muted = true;
              e.currentTarget.volume = 0;
            }}
            style={
              isSpeakerThree
                ? {
                    WebkitMaskImage:
                      'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)',
                    maskImage:
                      'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)',
                  }
                : undefined
            }
            className={
              isSpeakerThree
                ? 'absolute left-1/2 -translate-x-1/2 top-[-6.25%] w-[86.67%] h-[115.56%] max-w-none object-cover transition-transform duration-500 group-hover:scale-102'
                : isSpeakerTwo
                ? 'w-full h-full object-cover object-[50%_38%] transition-transform duration-500 group-hover:scale-102'
                : 'w-full h-full object-cover object-[50%_45%] transition-transform duration-500 group-hover:scale-102'
            }
          />
        ) : (
          <img 
            src={speaker.imageUrl} 
            alt={speaker.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
            loading="lazy"
          />
        )}

        {/* Floating Speaker Badge */}
        <div className="absolute top-3 left-3 z-20">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-white/95 text-orange-700 shadow-md backdrop-blur-md border border-orange-200">
            <Sparkles className="w-3 h-3 text-amber-500" />
            วิทยากร {index + 1}
          </span>
        </div>
      </div>

      {/* Speaker Information */}
      <div className="flex-1 flex flex-col">
        <div className="mb-2">
          <h3 className="font-extrabold text-slate-800 text-lg group-hover:text-orange-600 transition-colors">
            {speaker.name}
          </h3>
          <p className="text-xs font-semibold text-orange-600">
            {speaker.position}
          </p>
          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-medium">
            {speaker.role}
          </p>
        </div>

        {/* Bio */}
        <p className="text-xs text-slate-600 leading-relaxed mb-4 flex-1">
          {speaker.bio}
        </p>

        {/* Expertise Topics */}
        <div className="pt-3 border-t border-orange-100 mt-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
            <BookCheck className="w-3 h-3 text-orange-400" />
            หัวข้อความเชี่ยวชาญ
          </span>
          <div className="flex flex-wrap gap-1.5">
            {speaker.topics.map((topic, i) => (
              <span 
                key={i}
                className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-orange-50 text-orange-800 border border-orange-200/80"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
