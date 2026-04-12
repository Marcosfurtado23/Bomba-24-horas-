import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import AdminPanel from '../components/AdminPanel';
import { NewsArticle, VideoArticle } from '../types';

export default function Dashboard() {
  const [user, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [videos, setVideos] = useState<VideoArticle[]>([]);

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

    return () => {
      unsubscribeArticles();
      unsubscribeVideos();
    };
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const handleAddArticle = async (newArticleData: Omit<NewsArticle, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'articles'), {
        ...newArticleData,
        createdAt: new Date().toISOString()
      });
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
      await Promise.all(articles.map(article => 
        addDoc(collection(db, 'articles'), {
          ...article,
          createdAt: new Date().toISOString()
        })
      ));
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
      onAddArticle={handleAddArticle}
      onAddBulkArticles={handleAddBulkArticles}
      onEditArticle={handleEditArticle}
      onDeleteArticle={handleDeleteArticle}
      onAddVideo={handleAddVideo}
      onDeleteVideo={handleDeleteVideo}
    />
  );
}
