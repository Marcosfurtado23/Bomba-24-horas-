import React, { useState, useRef, useEffect } from 'react';
import { NewsArticle, VideoArticle } from '../types';
import { ArrowLeft, Save, Trash2, PlusCircle, Image as ImageIcon, Video, FileUp, Sun, Moon } from 'lucide-react';

interface AdminPanelProps {
  onBack: () => void;
  onAddArticle: (article: Omit<NewsArticle, 'id' | 'createdAt'>) => void;
  articles: NewsArticle[];
  onDeleteArticle: (id: string) => void;
  videos: VideoArticle[];
  onAddVideo: (video: Omit<VideoArticle, 'id' | 'createdAt'>) => void;
  onDeleteVideo: (id: string) => void;
}

export default function AdminPanel({ onBack, onAddArticle, articles, onDeleteArticle, videos, onAddVideo, onDeleteVideo }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'news' | 'videos'>('news');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isDay = currentTime.getHours() >= 6 && currentTime.getHours() < 18;

  // News State
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Urgente');
  const [imageUrl, setImageUrl] = useState('');
  
  // Video State
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoDuration, setVideoDuration] = useState('');
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setVideoDuration('00:00'); // Simulated duration
      
      // Auto-detect aspect ratio
      const video = document.createElement('video');
      video.src = url;
      video.onloadedmetadata = () => {
        const ratio = video.videoWidth / video.videoHeight;
        if (ratio > 1.2) {
          setVideoAspectRatio('16:9');
        } else if (ratio < 0.8) {
          setVideoAspectRatio('9:16');
        } else {
          setVideoAspectRatio('1:1');
        }
      };
    }
  };

  const handleNewsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddArticle({ title, summary, content, category, imageUrl });
    setTitle('');
    setSummary('');
    setContent('');
    setImageUrl('');
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddVideo({ title: videoTitle, videoUrl, duration: videoDuration, aspectRatio: videoAspectRatio });
    setVideoTitle('');
    setVideoUrl('');
    setVideoDuration('');
    setVideoAspectRatio('16:9');
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
      <header className="bg-gray-900 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4 flex-1">
              <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full transition-colors flex items-center gap-2 text-sm font-bold">
                <ArrowLeft size={20} /> Voltar ao Site
              </button>
            </div>
            <div className="font-black uppercase tracking-widest text-red-500 flex-1 text-center hidden md:block">
              Bomba 24h <span className="text-white">| Painel de Controle</span>
            </div>
            <div className="flex-1 flex justify-end items-center">
              <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-full text-sm font-mono text-gray-300">
                {isDay ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} className="text-blue-300" />}
                <span>
                  {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => setActiveTab('news')}
            className={`px-6 py-3 font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'news' ? 'bg-red-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
          >
            <ImageIcon size={20} /> Notícias
          </button>
          <button 
            onClick={() => setActiveTab('videos')}
            className={`px-6 py-3 font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'videos' ? 'bg-red-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
          >
            <Video size={20} /> Vídeos
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
              <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2 border-l-4 border-red-600 pl-3">
                <PlusCircle className="text-red-600" /> {activeTab === 'news' ? 'Nova Notícia' : 'Novo Vídeo'}
              </h2>
              
              {activeTab === 'news' ? (
                <form onSubmit={handleNewsSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Título da Notícia</label>
                    <input 
                      type="text" 
                      required
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                      placeholder="Ex: Escândalo no governo..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Resumo (Subtítulo)</label>
                    <textarea 
                      required
                      value={summary}
                      onChange={e => setSummary(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all resize-none"
                      placeholder="Breve descrição da notícia..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Conteúdo Completo</label>
                    <textarea 
                      required
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all resize-y"
                      placeholder="Escreva a notícia completa aqui..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Categoria</label>
                    <select 
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                    >
                      <option value="Urgente">Urgente</option>
                      <option value="Exclusivo">Exclusivo</option>
                      <option value="Política">Política</option>
                      <option value="Economia">Economia</option>
                      <option value="Polícia">Polícia</option>
                      <option value="Esportes">Esportes</option>
                      <option value="Famosos">Famosos</option>
                      <option value="Mundo">Mundo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Imagem (URL ou Galeria)</label>
                    <div className="flex gap-2 mb-2">
                      <input 
                        type="url" 
                        value={imageUrl}
                        onChange={e => setImageUrl(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                        placeholder="https://exemplo.com/imagem.jpg"
                      />
                      <button 
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center justify-center border border-gray-300"
                        title="Upload da Galeria"
                      >
                        <FileUp size={20} />
                      </button>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        ref={imageInputRef}
                        onChange={handleImageUpload}
                      />
                    </div>
                    {imageUrl && (
                      <div className="mt-2 aspect-video rounded-lg overflow-hidden border border-gray-200">
                        <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/400x225?text=Imagem+Inválida')} />
                      </div>
                    )}
                  </div>
                  <button 
                    type="submit"
                    disabled={!title || !summary || !imageUrl}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-black uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 mt-6 shadow-md"
                  >
                    <Save size={20} /> Publicar Notícia
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVideoSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Título do Vídeo</label>
                    <input 
                      type="text" 
                      required
                      value={videoTitle}
                      onChange={e => setVideoTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                      placeholder="Ex: Entrevista exclusiva..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Vídeo (URL ou Galeria)</label>
                    <div className="flex gap-2 mb-2">
                      <input 
                        type="url" 
                        value={videoUrl}
                        onChange={e => setVideoUrl(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                        placeholder="https://exemplo.com/video.mp4"
                      />
                      <button 
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center justify-center border border-gray-300"
                        title="Upload da Galeria"
                      >
                        <FileUp size={20} />
                      </button>
                      <input 
                        type="file" 
                        accept="video/*" 
                        className="hidden" 
                        ref={videoInputRef}
                        onChange={handleVideoUpload}
                      />
                    </div>
                    {videoUrl && (
                      <div className={`mt-2 ${videoAspectRatio === '9:16' ? 'aspect-[9/16] w-1/2 mx-auto' : videoAspectRatio === '1:1' ? 'aspect-square w-2/3 mx-auto' : 'aspect-video w-full'} rounded-lg overflow-hidden border border-gray-200 bg-black flex items-center justify-center relative transition-all duration-300`}>
                        {videoUrl.startsWith('blob:') ? (
                           <video src={videoUrl} className="w-full h-full object-contain" controls />
                        ) : (
                           <img src={videoUrl} alt="Preview" className="w-full h-full object-contain opacity-50" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/400x225?text=Vídeo+Inválido')} />
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Duração (Opcional)</label>
                    <input 
                      type="text" 
                      value={videoDuration}
                      onChange={e => setVideoDuration(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                      placeholder="Ex: 05:20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Formato do Vídeo</label>
                    <select 
                      value={videoAspectRatio}
                      onChange={e => setVideoAspectRatio(e.target.value as '16:9' | '9:16' | '1:1')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                    >
                      <option value="16:9">Horizontal (16:9) - Padrão</option>
                      <option value="9:16">Vertical (9:16) - Shorts/Reels</option>
                      <option value="1:1">Quadrado (1:1) - Feed</option>
                    </select>
                  </div>
                  <button 
                    type="submit"
                    disabled={!videoTitle || !videoUrl}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-black uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 mt-6 shadow-md"
                  >
                    <Save size={20} /> Publicar Vídeo
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-black uppercase mb-6 border-l-4 border-gray-800 pl-3">
                {activeTab === 'news' ? `Notícias Publicadas (${articles.length})` : `Vídeos Publicados (${videos.length})`}
              </h2>
              
              {activeTab === 'news' ? (
                <div className="space-y-4">
                  {articles.map((article, index) => (
                    <div key={article.id} className="flex gap-4 p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors group">
                      <div className="w-24 h-24 rounded-md overflow-hidden shrink-0 relative">
                        <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
                        {index === 0 && (
                          <div className="absolute top-0 left-0 w-full bg-red-600 text-white text-[10px] font-bold text-center py-0.5 uppercase">Manchete</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-red-600 uppercase bg-red-50 px-2 py-0.5 rounded">{article.category}</span>
                          <button 
                            onClick={() => onDeleteArticle(article.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors p-1"
                            title="Excluir notícia"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <h4 className="font-bold text-gray-900 truncate mb-1" title={article.title}>{article.title}</h4>
                        <p className="text-sm text-gray-500 line-clamp-2">{article.summary}</p>
                      </div>
                    </div>
                  ))}
                  {articles.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      Nenhuma notícia publicada.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {videos.map((video) => (
                    <div key={video.id} className="flex gap-4 p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors group">
                      <div className="w-32 aspect-video rounded-md overflow-hidden shrink-0 relative bg-black">
                        {video.videoUrl.startsWith('blob:') ? (
                          <video src={video.videoUrl} className="w-full h-full object-cover opacity-80" />
                        ) : (
                          <img src={video.videoUrl} alt={video.title} className="w-full h-full object-cover opacity-80" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Video size={20} className="text-white drop-shadow-md" />
                        </div>
                        {video.duration && (
                          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded">
                            {video.duration}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase bg-gray-100 px-2 py-0.5 rounded mb-1 inline-block">
                              {video.aspectRatio === '9:16' ? 'Vertical (9:16)' : video.aspectRatio === '1:1' ? 'Quadrado (1:1)' : 'Horizontal (16:9)'}
                            </span>
                            <h4 className="font-bold text-gray-900 line-clamp-2" title={video.title}>{video.title}</h4>
                          </div>
                          <button 
                            onClick={() => onDeleteVideo(video.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors p-1 shrink-0 ml-2"
                            title="Excluir vídeo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {videos.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      Nenhum vídeo publicado.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
