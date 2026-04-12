import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { doc, getDoc, updateDoc, increment, collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { NewsArticle } from '../types';
import { ArrowLeft, Clock, ChevronRight, PlayCircle } from 'lucide-react';

export default function ArticleView() {
  const { id } = useParams();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const hasIncrementedView = React.useRef(false);

  useEffect(() => {
    const fetchArticleAndRelated = async () => {
      if (!id) return;
      
      setLoading(true);
      hasIncrementedView.current = false; // Reset for new article
      
      try {
        const docRef = doc(db, 'articles', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as NewsArticle;
          setArticle({ id: docSnap.id, ...data });
          
          // Increment views only once per mount/article change
          if (!hasIncrementedView.current) {
            hasIncrementedView.current = true;
            try {
              await updateDoc(docRef, { views: increment(1) });
            } catch (e) {
              console.error("Failed to increment views", e);
            }
          }

          // Fetch related articles (same category, excluding current)
          try {
            const relatedQuery = query(
              collection(db, 'articles'),
              where('category', '==', data.category),
              orderBy('createdAt', 'desc'),
              limit(4)
            );
            
            const relatedSnap = await getDocs(relatedQuery);
            const relatedData: NewsArticle[] = [];
            
            relatedSnap.forEach((doc) => {
              if (doc.id !== id) {
                relatedData.push({ id: doc.id, ...doc.data() } as NewsArticle);
              }
            });
            
            // If we don't have enough related by category, fetch latest overall
            if (relatedData.length < 3) {
              const latestQuery = query(
                collection(db, 'articles'),
                orderBy('createdAt', 'desc'),
                limit(5)
              );
              const latestSnap = await getDocs(latestQuery);
              
              latestSnap.forEach((doc) => {
                if (doc.id !== id && !relatedData.find(a => a.id === doc.id)) {
                  relatedData.push({ id: doc.id, ...doc.data() } as NewsArticle);
                }
              });
            }
            
            setRelatedArticles(relatedData.slice(0, 3)); // Keep max 3
          } catch (e) {
            console.error("Failed to fetch related articles", e);
          }
        } else {
          setArticle(null);
        }
      } catch (error) {
        console.error("Error fetching article:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchArticleAndRelated();
    
    // Scroll to top when ID changes
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col bg-gray-50">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">Notícia não encontrada</h1>
        <Link to="/" className="text-red-600 hover:underline font-medium">Voltar para a página inicial</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Helmet>
        <title>{article.title} - Bomba 24 Horas</title>
        <meta name="description" content={article.summary} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.summary} />
        <meta property="og:image" content={`${window.location.origin}/api/image/${id}`} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={window.location.href} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.title} />
        <meta name="twitter:description" content={article.summary} />
        <meta name="twitter:image" content={`${window.location.origin}/api/image/${id}`} />
      </Helmet>

      <header className="bg-red-600 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ArrowLeft size={24} />
            <span className="font-bold uppercase tracking-wider">Voltar</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <article className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="aspect-video w-full overflow-hidden bg-gray-100">
            <img 
              src={article.imageUrl} 
              alt="" 
              className="w-full h-full object-cover" 
              {...(article.imageUrl?.startsWith('data:') ? {} : { referrerPolicy: 'no-referrer' })}
            />
          </div>
          <div className="p-6 md:p-10">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="bg-red-600 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-sm">
                {article.category}
              </span>
              <span className="text-gray-500 text-sm flex items-center gap-1">
                <Clock size={14} /> 
                {new Date(article.createdAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 leading-tight mb-6">
              {article.title}
            </h1>

            {/* Share Buttons */}
            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100">
              <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Compartilhar:</span>
              <a 
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(article.title + ' - Leia mais em: ' + window.location.href)}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                title="Compartilhar no WhatsApp"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
              <a 
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                title="Compartilhar no Facebook"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" /></svg>
              </a>
              <a 
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(article.title)}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                title="Compartilhar no X (Twitter)"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            </div>

            <p className="text-xl text-gray-600 font-medium mb-8 leading-relaxed border-l-4 border-gray-200 pl-4">
              {article.summary}
            </p>
            
            {article.videoUrl && (
              <div className="mb-8 aspect-video w-full rounded-xl overflow-hidden bg-black shadow-lg">
                {article.videoUrl.includes('youtube.com') || article.videoUrl.includes('youtu.be') ? (
                  <iframe 
                    src={`https://www.youtube.com/embed/${article.videoUrl.includes('youtu.be') ? article.videoUrl.split('/').pop()?.split('?')[0] : new URL(article.videoUrl).searchParams.get('v')}`} 
                    title="Video player" 
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
                ) : (
                  <video src={article.videoUrl} className="w-full h-full object-contain" controls />
                )}
              </div>
            )}

            <div className="prose prose-lg max-w-none text-gray-800">
              {article.content ? (
                article.content.split('\n').map((paragraph, idx) => (
                  paragraph.trim() ? (
                    <p key={idx} className="mb-4 leading-relaxed text-lg">{paragraph}</p>
                  ) : (
                    <br key={idx} />
                  )
                ))
              ) : (
                <p className="italic text-gray-500">O conteúdo completo desta notícia não está disponível.</p>
              )}
            </div>
          </div>
        </article>

        {/* Related Articles Section */}
        {relatedArticles.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-black text-gray-900 mb-6 uppercase tracking-tight border-l-4 border-red-600 pl-3">
              Notícias Relacionadas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map((related) => (
                <Link 
                  key={related.id} 
                  to={`/article/${related.id}`}
                  className="group bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all flex flex-col"
                >
                  <div className="aspect-video w-full overflow-hidden bg-gray-100 relative">
                    <img 
                      src={related.imageUrl} 
                      alt="" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      {...(related.imageUrl?.startsWith('data:') ? {} : { referrerPolicy: 'no-referrer' })}
                    />
                    {related.videoUrl && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                        <PlayCircle size={48} className="text-white drop-shadow-lg opacity-90 group-hover:scale-110 transition-transform" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-grow">
                    <span className="text-red-600 text-xs font-bold uppercase tracking-wider mb-2">
                      {related.category}
                    </span>
                    <h3 className="font-bold text-gray-900 leading-snug mb-3 group-hover:text-red-600 transition-colors line-clamp-3">
                      {related.title}
                    </h3>
                    <div className="mt-auto flex items-center text-xs text-gray-500 gap-1">
                      <Clock size={12} />
                      {new Date(related.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
