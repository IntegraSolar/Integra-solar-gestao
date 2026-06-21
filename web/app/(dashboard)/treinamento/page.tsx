'use client'

import { useState } from 'react'
import { Play, X } from 'lucide-react'

type Video = {
  title: string
  description: string
  youtubeId: string
}

const VIDEOS: Video[] = [
  {
    title: 'Em breve',
    description: 'Este vídeo será disponibilizado em breve.',
    youtubeId: '',
  },
  {
    title: 'Em breve',
    description: 'Este vídeo será disponibilizado em breve.',
    youtubeId: '',
  },
  {
    title: 'Em breve',
    description: 'Este vídeo será disponibilizado em breve.',
    youtubeId: '',
  },
]

export default function TreinamentoPage() {
  const [activeVideo, setActiveVideo] = useState<Video | null>(null)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-1">Treinamento</h1>
      <p className="text-sm text-white/40 mb-8">Aprenda a usar a plataforma com os vídeos abaixo.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {VIDEOS.map((video, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/10 overflow-hidden"
            style={{ background: 'var(--theme-surface)' }}
          >
            {/* Thumbnail */}
            <div
              className="relative aspect-video flex items-center justify-center"
              style={{ background: 'var(--theme-input-bg)' }}
            >
              {video.youtubeId ? (
                <>
                  <img
                    src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255,208,128,0.9)' }}
                    >
                      <Play size={20} style={{ color: 'var(--theme-accent-text)', marginLeft: 2 }} />
                    </div>
                  </div>
                </>
              ) : (
                <Play size={32} style={{ color: 'var(--theme-text-subtle)' }} />
              )}
            </div>

            {/* Info */}
            <div className="p-4">
              <h3 className="text-sm font-semibold text-white mb-1">{video.title}</h3>
              <p className="text-xs text-white/40 mb-3">{video.description}</p>
              <button
                onClick={() => video.youtubeId && setActiveVideo(video)}
                disabled={!video.youtubeId}
                className="px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
              >
                Assistir
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="relative w-full max-w-3xl rounded-2xl overflow-hidden border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full text-white/60 hover:text-white transition-colors"
              style={{ background: 'rgba(0,0,0,0.5)' }}
            >
              <X size={18} />
            </button>
            <div className="aspect-video">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?autoplay=1`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
