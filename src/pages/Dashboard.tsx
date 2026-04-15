import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import AdminPanel from '../components/AdminPanel';
import { NewsArticle, VideoArticle, TickerItem } from '../types';

export default function Dashboard() {
  const [user, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [videos, setVideos] = useState<VideoArticle[]>([]);
  const [tickerItems, setTickerItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate('/admin');
      } else {
        setUser(currentUser);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const articlesQuery = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
    const unsubscribeArticles = onSnapshot(articlesQuery, (snapshot) => {
      const articlesData: NewsArticle[] = [];
      snapshot.forEach((doc) => {
        articlesData.push({ id: doc.id, ...doc.data() } as NewsArticle);
      });
      setArticles(articlesData);
    }, (error) => {
      console.error("Error fetching articles:", error);
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
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const handleAddArticle = async (newArticleData: Omit<NewsArticle, 'id' | 'createdAt'>) => {
    try {
      const docRef = await addDoc(collection(db, 'articles'), {
        ...newArticleData,
        createdAt: new Date().toISOString()
      });

      // Trigger push notification
      try {
        const { getDocs } = await import('firebase/firestore');
        const subsSnapshot = await getDocs(collection(db, 'subscriptions'));
        const subscriptions = subsSnapshot.docs.map(d => d.data());
        
        if (subscriptions.length > 0) {
          await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscriptions,
              payload: {
                title: newArticleData.title,
                url: `/article/${docRef.id}`
              }
            })
          });
        }
      } catch (notifyError) {
        console.error("Error triggering notifications:", notifyError);
      }

    } catch (error: any) {
      console.error("Error adding article:", error);
      if (error.message && error.message.includes('payload is too large')) {
        alert("Erro: A imagem escolhida é muito grande. Tente uma imagem com tamanho menor.");
      } else {
        alert("Erro ao adicionar notícia. A imagem pode ser muito grande ou você não tem permissão.");
      }
    }
  };

  const handleAddBulkArticles = async (articles: Omit<NewsArticle, 'id' | 'createdAt'>[]) => {
    try {
      // Using Promise.all for simplicity. For very large batches, consider writeBatch.
      const docRefs = await Promise.all(articles.map(article => 
        addDoc(collection(db, 'articles'), {
          ...article,
          createdAt: new Date().toISOString()
        })
      ));

      // Trigger push notification for the first article in the batch (to avoid spamming)
      if (articles.length > 0 && docRefs.length > 0) {
        try {
          const { getDocs } = await import('firebase/firestore');
          const subsSnapshot = await getDocs(collection(db, 'subscriptions'));
          const subscriptions = subsSnapshot.docs.map(d => d.data());
          
          if (subscriptions.length > 0) {
            await fetch('/api/notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subscriptions,
                payload: {
                  title: articles[0].title,
                  url: `/article/${docRefs[0].id}`
                }
              })
            });
          }
        } catch (notifyError) {
          console.error("Error triggering notifications:", notifyError);
        }
      }

    } catch (error: any) {
      console.error("Error adding bulk articles:", error);
      if (error.message && error.message.includes('payload is too large')) {
        alert("Erro: Uma das imagens escolhidas é muito grande. Tente imagens com tamanho menor.");
      }
      throw error;
    }
  };

  const handleEditArticle = async (id: string, updatedData: Partial<NewsArticle>) => {
    try {
      await updateDoc(doc(db, 'articles', id), updatedData);
    } catch (error: any) {
      console.error("Error updating article:", error);
      if (error.message && error.message.includes('payload is too large')) {
        alert("Erro: A imagem escolhida é muito grande. Tente uma imagem com tamanho menor.");
      } else {
        alert("Erro ao atualizar notícia. A imagem pode ser muito grande ou houve um problema de conexão.");
      }
    }
  };

  const handleDeleteArticle = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'articles', id));
    } catch (error) {
      console.error("Error deleting article:", error);
      alert("Erro ao deletar notícia.");
    }
  };

  const handleAddVideo = async (newVideoData: Omit<VideoArticle, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'videos'), {
        ...newVideoData,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error adding video:", error);
      alert("Erro ao adicionar vídeo.");
    }
  };

  const handleDeleteVideo = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'videos', id));
    } catch (error) {
      console.error("Error deleting video:", error);
      alert("Erro ao deletar vídeo.");
    }
  };

  const handleAddTickerItem = async (text: string) => {
    try {
      await addDoc(collection(db, 'ticker'), {
        text,
        createdAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Error adding ticker item:", error);
      alert("Erro ao adicionar notícia ao letreiro: " + (error.message || error));
    }
  };

  const handleDeleteTickerItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'ticker', id));
    } catch (error) {
      console.error("Error deleting ticker item:", error);
      alert("Erro ao deletar notícia do letreiro.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AdminPanel 
      onBack={handleLogout} 
      articles={articles}
      videos={videos}
      tickerItems={tickerItems}
      onAddArticle={handleAddArticle}
      onAddBulkArticles={handleAddBulkArticles}
      onEditArticle={handleEditArticle}
      onDeleteArticle={handleDeleteArticle}
      onAddVideo={handleAddVideo}
      onDeleteVideo={handleDeleteVideo}
      onAddTickerItem={handleAddTickerItem}
      onDeleteTickerItem={handleDeleteTickerItem}
    />
  );
}
