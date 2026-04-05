import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
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
    } catch (error) {
      console.error("Error adding article:", error);
      alert("Erro ao adicionar notícia. Verifique se você tem permissão.");
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
      onDeleteArticle={handleDeleteArticle}
      onAddVideo={handleAddVideo}
      onDeleteVideo={handleDeleteVideo}
    />
  );
}
