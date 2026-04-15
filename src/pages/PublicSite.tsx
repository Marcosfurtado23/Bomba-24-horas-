import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Menu, Search, Bell, ChevronRight, Clock, AlertTriangle, TrendingUp, X, PlayCircle, CheckCircle, Download } from 'lucide-react';
import { NewsArticle, VideoArticle, TickerItem } from '../types';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc } from 'firebase/firestore';

const publicVapidKey = "BHcD_uds4CvnJekR3_QxpwL-ieiZgshI5_RcDqz7zyu7DUhbVoU67F02rQAtcut8hpvMf_E7HxDgOX0lJq1nXus";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const getAspectRatioClass = (ratio?: string) => {
  switch (ratio) {
    case '9:16': return 'aspect-[9/16]';
    case '1:1': return 'aspect-square';
    case '16:9':
    default: return 'aspect-video';
  }
};

const getModalContainerClass = (ratio?: string) => {
  switch (ratio) {
    case '9:16': return 'h-full max-h-[90vh] aspect-[9/16]';
    case '1:1': return 'h-full max-h-[90vh] aspect-square';
    case '16:9':
    default: return 'w-full max-w-5xl aspect-video';
  }
};

export default function PublicSite() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Início');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);
  
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [videos, setVideos] = useState<VideoArticle[]>([]);
  const [tickerItems, setTickerItems] = useState<TickerItem[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      setDeferredPrompt(null);
    }
  };

  const categories = ['Início', 'Política', 'Economia', 'Polícia', 'Esportes', 'Famosos'];

  useEffect(() => {
    if (initialLoad) {
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.floor(Math.random() * 10) + 5;
        });
      }, 200);
      return () => clearInterval(interval);
    } else {
      setLoadingProgress(100);
      setTimeout(() => setShowLoadingScreen(false), 500);
    }
  }, [initialLoad]);

  useEffect(() => {
    const articlesQuery = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
    const unsubscribeArticles = onSnapshot(articlesQuery, (snapshot) => {
      const articlesData: NewsArticle[] = [];
      snapshot.forEach((doc) => {
        articlesData.push({ id: doc.id, ...doc.data() } as NewsArticle);
      });
      setArticles(articlesData);
      setInitialLoad(false);
    }, (error) => {
      console.error("Error fetching articles:", error);
      setInitialLoad(false);
    });

    const videosQuery = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
    const unsubscribeVideos = onSnapshot(videosQuery, (snapshot) => {
      const videosData: VideoArticle[] = [];
      snapshot.forEach((doc) => {
        videosData.push({ id: doc.id, ...doc.data() } as VideoArticle);
      });
      setVideos(videosData);
    }, (error) => {
      console.error("Error fetching videos:", error);
    });

    const tickerQuery = query(collection(db, 'ticker'), orderBy('createdAt', 'desc'));
    const unsubscribeTicker = onSnapshot(tickerQuery, (snapshot) => {
      const tickerData: TickerItem[] = [];
      snapshot.forEach((doc) => {
        tickerData.push({ id: doc.id, ...doc.data() } as TickerItem);
      });
      setTickerItems(tickerData);
    }, (error) => {
      console.error("Error fetching ticker items:", error);
    });

    return () => {
      unsubscribeArticles();
      unsubscribeVideos();
      unsubscribeTicker();
    };
  }, []);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => setIsLoadingMore(false), 1500);
  };

  const handleSubscribe = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Seu navegador não suporta notificações.');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Você precisa permitir as notificações no seu navegador.');
        return;
      }

      // Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });

      // Save to Firestore
      await addDoc(collection(db, 'subscriptions'), JSON.parse(JSON.stringify(subscription)));
      
      setIsSubscribed(true);
      setTimeout(() => setIsSubscribed(false), 3000);
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      alert('Erro ao ativar notificações.');
    }
  };

  const heroArticle = articles[0];
  const secondaryArticles = articles.slice(1, 3);
  const listArticles = articles.slice(3);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Loading Screen */}
      {showLoadingScreen && (
        <div className={`fixed inset-0 z-[9999] bg-red-600 flex flex-col items-center justify-center transition-opacity duration-500 ${loadingProgress === 100 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex flex-col items-center max-w-xs w-full px-6">
            <div className="w-24 h-24 bg-white rounded-2xl p-2 mb-8 shadow-2xl animate-pulse">
              <img src="/logo.png" alt="Bomba 24h" className="w-full h-full object-contain" />
            </div>
            <div className="w-full bg-red-800 rounded-full h-2.5 mb-2 overflow-hidden">
              <div 
                className="bg-white h-2.5 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
            <p className="text-white font-bold text-sm uppercase tracking-widest">{loadingProgress}%</p>
          </div>
        </div>
      )}

      {/* Top Bar - Breaking News Ticker */}
      <div className="bg-red-700 text-white px-4 py-2 text-sm flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap w-full">
          <span className="bg-white text-red-700 px-2 py-0.5 font-bold rounded-sm text-xs uppercase tracking-wider flex items-center gap-1 shrink-0">
            <AlertTriangle size={14} /> Urgente
          </span>
          {tickerItems.length > 0 ? (
            <marquee className="font-medium" scrollamount="5">
              {tickerItems.map((item, index) => (
                <span key={item.id}>
                  {item.text}
                  {index < tickerItems.length - 1 && <span className="mx-4">•</span>}
                </span>
              ))}
            </marquee>
          ) : (
            <marquee className="font-medium" scrollamount="5">
              Nenhuma notícia urgente no momento.
            </marquee>
          )}
        </div>
        <div className="hidden md:flex items-center gap-4 text-xs font-medium opacity-90 shrink-0 ml-4">
          <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-red-600 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              <button 
                className="p-2 hover:bg-red-700 rounded-full transition-colors lg:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <a href="#" className="flex items-center gap-2 group">
                <div className="bg-white p-2 rounded-lg group-hover:scale-105 transition-transform">
                  <Flame size={32} className="text-red-600 fill-red-600" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-3xl font-black tracking-tighter uppercase italic">Bomba</span>
                  <span className="text-sm font-bold tracking-widest uppercase text-red-200">24 Horas</span>
                </div>
              </a>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8 font-bold uppercase text-sm tracking-wider">
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`transition-colors border-b-2 py-2 ${activeCategory === cat ? 'text-white border-white' : 'text-red-100 border-transparent hover:text-white hover:border-red-300'}`}
                >
                  {cat}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {deferredPrompt && (
                <button 
                  onClick={handleInstallClick}
                  className="hidden sm:flex items-center gap-1 bg-yellow-400 hover:bg-yellow-500 text-red-900 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-colors"
                >
                  <Download size={14} /> Instalar App
                </button>
              )}
              {isSearchOpen && (
                <input 
                  type="text" 
                  placeholder="Buscar..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="hidden sm:block px-3 py-1.5 rounded-full text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 w-48 transition-all"
                  autoFocus
                />
              )}
              <button 
                className="p-2 hover:bg-red-700 rounded-full transition-colors"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
              >
                {isSearchOpen ? <X size={20} /> : <Search size={20} />}
              </button>
              <button 
                onClick={handleSubscribe}
                className="p-2 hover:bg-red-700 rounded-full transition-colors relative"
                title="Ativar Notificações"
              >
                {isSubscribed ? <CheckCircle size={20} className="text-yellow-400" /> : <Bell size={20} />}
                {!isSubscribed && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full border-2 border-red-600"></span>}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-red-800 text-white font-bold uppercase tracking-wider text-sm shadow-inner">
          <nav className="flex flex-col px-4 py-2">
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setIsMobileMenuOpen(false);
                }}
                className={`text-left py-3 border-b border-red-700 last:border-0 ${activeCategory === cat ? 'text-yellow-400' : 'text-white'}`}
              >
                {cat}
              </button>
            ))}
            {deferredPrompt && (
              <button 
                onClick={() => {
                  handleInstallClick();
                  setIsMobileMenuOpen(false);
                }}
                className="text-left py-3 text-yellow-400 font-black flex items-center gap-2"
              >
                <Download size={18} /> INSTALAR APLICATIVO
              </button>
            )}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column - Main News (Spans 8 cols on large screens) */}
          <div className="lg:col-span-8 space-y-8">
            
            {initialLoad ? (
              <div className="animate-pulse space-y-8">
                <div className="aspect-video w-full bg-gray-200 rounded-xl"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="aspect-[16/9] w-full bg-gray-200 rounded-xl"></div>
                  <div className="aspect-[16/9] w-full bg-gray-200 rounded-xl"></div>
                </div>
              </div>
            ) : (
              <>
                {/* Hero Article */}
                {heroArticle && (
                  <Link to={`/article/${heroArticle.id}`} className="block">
                    <article className="relative group overflow-hidden rounded-xl shadow-lg cursor-pointer">
                      <div className="aspect-video w-full overflow-hidden relative">
                        <img 
                          src={heroArticle.imageUrl} 
                          alt="" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          {...(heroArticle.imageUrl?.startsWith('data:') ? {} : { referrerPolicy: 'no-referrer' })}
                        />
                        {heroArticle.videoUrl && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                            <PlayCircle size={64} className="text-white drop-shadow-lg opacity-90 group-hover:scale-110 transition-transform" />
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-6 md:p-8">
                        <span className="bg-red-600 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-sm w-max mb-3">{heroArticle.category}</span>
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-3 group-hover:text-red-400 transition-colors">
                          {heroArticle.title}
                        </h1>
                        <p className="text-gray-200 text-sm md:text-base line-clamp-2 mb-4 max-w-3xl">
                          {heroArticle.summary}
                        </p>
                        <div className="flex items-center gap-4 text-gray-300 text-xs font-medium">
                          <span className="flex items-center gap-1"><Clock size={14} /> Agora</span>
                          <span className="flex items-center gap-1"><TrendingUp size={14} /> Em alta</span>
                        </div>
                      </div>
                    </article>
                  </Link>
                )}

                {/* Secondary News Grid */}
                {secondaryArticles.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {secondaryArticles.map((article) => (
                      <Link to={`/article/${article.id}`} key={article.id} className="block">
                        <article className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow group cursor-pointer border border-gray-100 h-full">
                          <div className="aspect-[16/9] overflow-hidden relative">
                            <img 
                              src={article.imageUrl} 
                              alt="" 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              {...(article.imageUrl?.startsWith('data:') ? {} : { referrerPolicy: 'no-referrer' })}
                            />
                            <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold uppercase px-2 py-1 rounded-sm">{article.category}</div>
                            {article.videoUrl && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                                <PlayCircle size={48} className="text-white drop-shadow-lg opacity-90 group-hover:scale-110 transition-transform" />
                              </div>
                            )}
                          </div>
                          <div className="p-5">
                            <h2 className="text-xl font-bold leading-tight mb-2 group-hover:text-red-600 transition-colors">{article.title}</h2>
                            <p className="text-gray-600 text-sm line-clamp-2 mb-4">{article.summary}</p>
                            <div className="flex items-center justify-between text-gray-400 text-xs">
                              <span className="flex items-center gap-1"><Clock size={14} /> Recente</span>
                            </div>
                          </div>
                        </article>
                      </Link>
                    ))}
                  </div>
                )}

                {/* List News */}
                {listArticles.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                      <h3 className="text-2xl font-black uppercase text-gray-900 border-l-4 border-red-600 pl-3">Destaques</h3>
                      <a href="#" className="text-red-600 text-sm font-bold hover:underline flex items-center">Ver tudo <ChevronRight size={16} /></a>
                    </div>
                    <div className="space-y-6">
                      {listArticles.map((item) => (
                        <Link to={`/article/${item.id}`} key={item.id} className="block">
                          <article className="flex gap-4 group cursor-pointer">
                            <div className="w-1/3 sm:w-1/4 aspect-video rounded-lg overflow-hidden shrink-0 relative">
                              <img src={item.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" {...(item.imageUrl?.startsWith('data:') ? {} : { referrerPolicy: 'no-referrer' })} />
                              {item.videoUrl && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                                  <PlayCircle size={32} className="text-white drop-shadow-lg opacity-90 group-hover:scale-110 transition-transform" />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col justify-center w-full">
                          <span className="text-red-600 text-xs font-bold uppercase mb-1">{item.category}</span>
                          <h4 className="text-base sm:text-lg font-bold leading-tight mb-2 group-hover:text-red-600 transition-colors">{item.title}</h4>
                          <div className="flex items-center justify-between text-gray-400 text-xs mt-auto">
                            <span className="flex items-center gap-1"><Clock size={14} /> Hoje</span>
                          </div>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Video Section */}
            {videos.length > 0 && (
              <div className="bg-gray-900 text-white rounded-xl shadow-sm overflow-hidden p-6">
                <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-4">
                  <h3 className="text-2xl font-black uppercase flex items-center gap-2 border-l-4 border-red-600 pl-3">
                    <PlayCircle className="text-red-500" /> Bomba TV
                  </h3>
                  <a href="#" className="text-red-400 text-sm font-bold hover:underline flex items-center">Mais vídeos <ChevronRight size={16} /></a>
                </div>
                
                {videos[0] && (
                  <div 
                    className={`relative ${getAspectRatioClass(videos[0].aspectRatio)} rounded-lg overflow-hidden group cursor-pointer mb-4 bg-black`}
                    onClick={() => {
                      setSelectedVideo(videos[0].title);
                      setPlayingVideoUrl(videos[0].videoUrl);
                    }}
                  >
                    {videos[0].videoUrl.startsWith('blob:') ? (
                      <video src={videos[0].videoUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    ) : (
                      <img 
                        src={videos[0].videoUrl} 
                        alt="Video thumbnail" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <div className="w-0 h-0 border-t-8 border-t-transparent border-l-[16px] border-l-white border-b-8 border-b-transparent ml-1"></div>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                      <span className="bg-red-600 text-white text-xs font-bold uppercase px-2 py-1 rounded-sm mb-2 inline-block">Destaque</span>
                      <h4 className="text-xl md:text-2xl font-bold leading-tight group-hover:text-red-400 transition-colors">{videos[0].title}</h4>
                    </div>
                  </div>
                )}

                {videos.length > 1 && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {videos.slice(1, 3).map((video) => (
                      <div key={video.id} className="group cursor-pointer" onClick={() => {
                        setSelectedVideo(video.title);
                        setPlayingVideoUrl(video.videoUrl);
                      }}>
                        <div className={`${getAspectRatioClass(video.aspectRatio)} rounded-lg overflow-hidden relative mb-2 bg-black`}>
                          {video.videoUrl.startsWith('blob:') ? (
                            <video src={video.videoUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <img src={video.videoUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Thumbnail" referrerPolicy="no-referrer" />
                          )}
                          {video.duration && (
                            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">{video.duration}</div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                            <PlayCircle size={32} className="text-white drop-shadow-md" />
                          </div>
                        </div>
                        <h5 className="text-sm font-bold group-hover:text-red-400 transition-colors line-clamp-2">{video.title}</h5>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            </>
            )}
          </div>

          {/* Right Column - Sidebar (Spans 4 cols on large screens) */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Breaking News Feed */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                <h3 className="text-xl font-black uppercase text-gray-900">Plantão 24h</h3>
              </div>
              
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                {articles.slice(0, 6).map((article, i) => (
                  <div key={article.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-red-100 text-red-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ml-1 md:ml-0">
                      <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                    </div>
                    <Link to={`/article/${article.id}`} className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg bg-gray-50 border border-gray-100 group-hover:border-red-200 group-hover:bg-red-50 transition-colors cursor-pointer block">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-red-600 text-xs">{new Date(article.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-sm text-gray-700 font-medium leading-snug line-clamp-2">{article.title}</p>
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Most Read News */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="text-blue-600" size={24} />
                <h3 className="text-xl font-black uppercase text-gray-900">Mais Lidas</h3>
              </div>
              
              <div className="space-y-4">
                {[...articles].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5).map((article, index) => (
                  <Link key={article.id} to={`/article/${article.id}`} className="flex gap-4 group items-center">
                    <span className="text-4xl font-black text-gray-200 group-hover:text-blue-100 transition-colors">
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 text-sm">
                        {article.title}
                      </h4>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Newsletter/Alerts */}
            <div className="bg-red-700 rounded-xl shadow-md p-6 text-white text-center relative overflow-hidden">
              <Flame className="absolute -right-4 -top-4 w-32 h-32 text-red-600 opacity-50" />
              <div className="relative z-10">
                <AlertTriangle size={32} className="mx-auto mb-3 text-yellow-400" />
                <h3 className="text-2xl font-black uppercase mb-2">Receba Alertas</h3>
                <p className="text-red-100 text-sm mb-6">Seja o primeiro a saber quando a bomba estourar. Inscreva-se para alertas urgentes.</p>
                <form className="space-y-3" onSubmit={handleSubscribe}>
                  {isSubscribed ? (
                    <div className="bg-green-500 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-bold animate-pulse">
                      <CheckCircle size={20} /> Inscrito com sucesso!
                    </div>
                  ) : (
                    <>
                      <input 
                        type="email" 
                        required
                        placeholder="Seu melhor e-mail" 
                        className="w-full px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                      <button type="submit" className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-red-900 font-black uppercase tracking-wider rounded-lg transition-colors">
                        Quero ser avisado
                      </button>
                    </>
                  )}
                </form>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white pt-12 pb-6 border-t-4 border-red-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-1">
              <a href="#" className="flex items-center gap-2 mb-4">
                <Flame size={28} className="text-red-500 fill-red-500" />
                <div className="flex flex-col leading-none">
                  <span className="text-2xl font-black tracking-tighter uppercase italic text-white">Bomba</span>
                  <span className="text-xs font-bold tracking-widest uppercase text-red-500">24 Horas</span>
                </div>
              </a>
              <p className="text-gray-400 text-sm mb-4">
                O portal de notícias mais rápido e impactante do Brasil. Informação urgente, 24 horas por dia, 7 dias por semana.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold uppercase tracking-wider mb-4 text-gray-300">Editorias</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-red-400 transition-colors">Política</a></li>
                <li><a href="#" className="hover:text-red-400 transition-colors">Economia</a></li>
                <li><a href="#" className="hover:text-red-400 transition-colors">Polícia</a></li>
                <li><a href="#" className="hover:text-red-400 transition-colors">Esportes</a></li>
                <li><a href="#" className="hover:text-red-400 transition-colors">Entretenimento</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold uppercase tracking-wider mb-4 text-gray-300">Institucional</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-red-400 transition-colors">Sobre Nós</a></li>
                <li><a href="#" className="hover:text-red-400 transition-colors">Expediente</a></li>
                <li><a href="#" className="hover:text-red-400 transition-colors">Anuncie</a></li>
                <li><a href="#" className="hover:text-red-400 transition-colors">Trabalhe Conosco</a></li>
                <li><a href="#" className="hover:text-red-400 transition-colors">Contato</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold uppercase tracking-wider mb-4 text-gray-300">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-red-400 transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-red-400 transition-colors">Política de Privacidade</a></li>
                <li><a href="#" className="hover:text-red-400 transition-colors">Política de Cookies</a></li>
                <li><Link to="/admin" className="hover:text-red-400 transition-colors">Painel Admin</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-xs text-center md:text-left">
              &copy; {new Date().getFullYear()} Bomba 24 Horas. Todos os direitos reservados.
            </p>
            <div className="flex gap-4">
              <a href="https://www.facebook.com/profile.php?id=61588394128426" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-red-600 hover:text-white transition-colors">
                <span className="sr-only">Facebook</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" /></svg>
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-red-600 hover:text-white transition-colors">
                <span className="sr-only">Instagram</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" /></svg>
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-red-600 hover:text-white transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Video Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm">
          <button 
            onClick={() => {
              setSelectedVideo(null);
              setPlayingVideoUrl(null);
            }}
            className="absolute top-6 right-6 text-white hover:text-red-500 transition-colors bg-black/50 p-2 rounded-full z-10"
          >
            <X size={32} />
          </button>
          <div className={`${getModalContainerClass(videos.find(v => v.title === selectedVideo)?.aspectRatio)} bg-gray-900 rounded-xl overflow-hidden relative shadow-2xl border border-gray-800 transition-all duration-300`}>
            {playingVideoUrl && playingVideoUrl.startsWith('blob:') ? (
              <video src={playingVideoUrl} className="w-full h-full object-contain bg-black" controls autoPlay />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center flex-col gap-6">
                <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.6)] animate-pulse">
                  <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[24px] border-l-white border-b-[12px] border-b-transparent ml-2"></div>
                </div>
                <div className="text-center px-6">
                  <p className="text-red-500 font-bold uppercase tracking-widest text-sm mb-2">Reproduzindo</p>
                  <p className="text-white font-black text-2xl md:text-3xl">{selectedVideo}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
