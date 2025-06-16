import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db, auth } from "../firebase/firebase";
import { useParams, useNavigate } from "react-router-dom";

const ProfilePage = () => {
  const { userId: routeUserId } = useParams();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [newBio, setNewBio] = useState("");
  const [newName, setNewName] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEventIndex, setEditingEventIndex] = useState(null);
  const [followerProfiles, setFollowerProfiles] = useState([]);
  const [followingProfiles, setFollowingProfiles] = useState([]);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    eventImageBase64: "",
    date: "",
    time: "",
    location: "",
  });
  const [visibleCommentsProfile, setVisibleCommentsProfile] = useState({});
  const [newCommentTextProfile, setNewCommentTextProfile] = useState({});

  const currentUser = auth.currentUser;
  const currentUserId = currentUser?.uid;
  const profileUserId = routeUserId || currentUserId; // Eğer route'dan id geldiyse onu, gelmediyse kendi id'mizi gösteriyoruz

  const isOwnProfile = profileUserId === currentUserId;

  useEffect(() => {
    if (!profileUserId) return;

    const fetchUserProfile = async () => {
      const docRef = doc(db, "users", profileUserId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
        setNewName(docSnap.data().name || "");
        setNewBio(docSnap.data().bio || "");
      }

      if (!isOwnProfile && currentUserId) {
        const currentUserRef = doc(db, "users", currentUserId);
        const currentUserSnap = await getDoc(currentUserRef);
        const currentUserData = currentUserSnap.data();
        setIsFollowing(currentUserData?.following?.includes(profileUserId));
      }
    };

    fetchUserProfile();
  }, [profileUserId, currentUserId, isOwnProfile]);

  useEffect(() => {
    const fetchFollowProfiles = async () => {
      if (!userProfile) return;

      const fetchUsersByIds = async (ids) => {
        const results = await Promise.all(
          ids.map(async (id) => {
            const docRef = doc(db, "users", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              return { id, name: docSnap.data().name || "İsimsiz Kullanıcı" };
            } else {
              return { id, name: "Bilinmeyen Kullanıcı" };
            }
          })
        );
        return results;
      };

      if (userProfile.followers?.length) {
        const followersData = await fetchUsersByIds(userProfile.followers);
        setFollowerProfiles(followersData);
      }

      if (userProfile.following?.length) {
        const followingData = await fetchUsersByIds(userProfile.following);
        setFollowingProfiles(followingData);
      }
    };

    fetchFollowProfiles();
  }, [userProfile]);


  const updateBio = async () => {
    const userRef = doc(db, "users", currentUserId);
    await updateDoc(userRef, { bio: newBio });
    setUserProfile((prev) => ({ ...prev, bio: newBio }));
    setNewBio("");
  };

  const updateName = async () => {
    const userRef = doc(db, "users", currentUserId);
    await updateDoc(userRef, { name: newName });
    setUserProfile((prev) => ({ ...prev, name: newName }));
  };

  const followUser = async () => {
    if (!currentUserId) return;
    const currentUserRef = doc(db, "users", currentUserId);
    await updateDoc(currentUserRef, { following: arrayUnion(profileUserId) });

    const targetUserRef = doc(db, "users", profileUserId);
    await updateDoc(targetUserRef, { followers: arrayUnion(currentUserId) });

    setIsFollowing(true);
  };

  const unfollowUser = async () => {
    if (!currentUserId) return;
    const currentUserRef = doc(db, "users", currentUserId);
    await updateDoc(currentUserRef, { following: arrayRemove(profileUserId) });

    const targetUserRef = doc(db, "users", profileUserId);
    await updateDoc(targetUserRef, { followers: arrayRemove(currentUserId) });

    setIsFollowing(false);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      const userRef = doc(db, "users", currentUserId);
      await updateDoc(userRef, { profilePicture: base64String });
      setUserProfile((prev) => ({ ...prev, profilePicture: base64String }));
    };
    reader.readAsDataURL(file);
  };

  const handleEventImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      setNewEvent((prev) => ({ ...prev, eventImageBase64: "" }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setNewEvent((prev) => ({ ...prev, eventImageBase64: dataUrl }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleNewEventChange = (e) => {
    const { name, value } = e.target;
    setNewEvent((prev) => ({ ...prev, [name]: value }));
  };

  const shareEvent = async () => {
    const sanitizedEvent = {
      title: newEvent.title || "",
      description: newEvent.description || "",
      eventImageBase64: newEvent.eventImageBase64 || "",
      date: newEvent.date || "",
      time: newEvent.time || "",
      location: newEvent.location || "",
      sharedAt: new Date().toISOString(),
      likes: newEvent.likes || [],
      attendees: newEvent.attendees || [],
      comments: newEvent.comments || [],
    };

    const updatedEvents = [...(userProfile.events || [])];

    if (editingEventIndex !== null) {
      updatedEvents[editingEventIndex] = sanitizedEvent;
    } else {
      updatedEvents.unshift(sanitizedEvent);
    }

    const userRef = doc(db, "users", currentUserId);
    try {
      await updateDoc(userRef, { events: updatedEvents });
      setUserProfile((prev) => ({ ...prev, events: updatedEvents }));
      setNewEvent({ title: "", description: "", eventImageBase64: "", date: "", time: "", location: "" });
      setShowEventForm(false);
      setEditingEventIndex(null);
    } catch (error) {
      console.error("Etkinlik güncellenemedi:", error);
    }
  };

  const handleLikeOnProfile = async (eventIndex) => {
    if (!currentUserId || !userProfile || !userProfile.events || userProfile.events[eventIndex] === undefined) {
      console.error("Beğeni işlemi için kullanıcı ID, profil, etkinlikler veya etkinlik index'i eksik.");
      return;
    }

    const userDocRef = doc(db, "users", profileUserId); // Etkinliğin sahibinin referansı

    try {
      const updatedEvents = [...userProfile.events];
      const eventToUpdate = { ...updatedEvents[eventIndex] }; // Kopyasını oluştur
      
      const eventLikes = eventToUpdate.likes || [];
      const userHasLiked = eventLikes.includes(currentUserId);

      if (userHasLiked) {
        eventToUpdate.likes = eventLikes.filter(id => id !== currentUserId); // arrayRemove benzeri
      } else {
        eventToUpdate.likes = [...eventLikes, currentUserId]; // arrayUnion benzeri
      }
      
      updatedEvents[eventIndex] = eventToUpdate;

      await updateDoc(userDocRef, { events: updatedEvents });

      // Update local state to reflect the change immediately
      setUserProfile((prevProfile) => ({
        ...prevProfile,
        events: updatedEvents,
      }));

    } catch (error) {
      console.error("Profil sayfasında beğeni güncellenirken hata:", error);
    }
  };

  const handleAttendOnProfile = async (eventIndex) => {
    if (!currentUserId || !userProfile || !userProfile.events || userProfile.events[eventIndex] === undefined) {
      console.error("Profil sayfasında katılım işlemi için gerekli bilgiler eksik.");
      return;
    }

    const userDocRef = doc(db, "users", profileUserId); // Etkinliğin sahibinin referansı

    try {
      const updatedEvents = [...userProfile.events];
      const eventToUpdate = { ...updatedEvents[eventIndex] }; 
      
      const eventAttendees = eventToUpdate.attendees || [];
      const userHasAttended = eventAttendees.includes(currentUserId);

      if (userHasAttended) {
        eventToUpdate.attendees = eventAttendees.filter(id => id !== currentUserId);
      } else {
        eventToUpdate.attendees = [...eventAttendees, currentUserId];
      }
      
      updatedEvents[eventIndex] = eventToUpdate;

      await updateDoc(userDocRef, { events: updatedEvents });

      setUserProfile((prevProfile) => ({
        ...prevProfile,
        events: updatedEvents,
      }));

    } catch (error) {
      console.error("Profil sayfasında katılım güncellenirken hata:", error);
    }
  };

  const toggleCommentsVisibilityProfile = (eventIndex) => {
    setVisibleCommentsProfile(prev => ({
      ...prev,
      [eventIndex]: !prev[eventIndex]
    }));
  };

  const handleCommentTextChangeProfile = (eventIndex, text) => {
    setNewCommentTextProfile(prev => ({
      ...prev,
      [eventIndex]: text
    }));
  };

  const handleAddCommentOnProfile = async (eventIndex) => {
    const commentText = (newCommentTextProfile[eventIndex] || "").trim();

    if (!currentUserId || !commentText) {
      console.error("Yorum eklemek için kullanıcı girişi yapılmalı ve yorum metni boş olmamalıdır (Profil).");
      return;
    }
    if (!userProfile || !userProfile.events || userProfile.events[eventIndex] === undefined) {
      console.error("Yorum eklenecek etkinlik bulunamadı (Profil).");
      return;
    }

    const userDocRef = doc(db, "users", profileUserId); // Profil sahibinin referansı

    try {
      const updatedEvents = JSON.parse(JSON.stringify(userProfile.events)); // Derin kopya
      const eventToUpdate = updatedEvents[eventIndex];

      const newComment = {
        userId: currentUserId,
        userName: currentUser.displayName || currentUser.email || "Bilinmeyen Kullanıcı",
        text: commentText,
        timestamp: new Date().toISOString(),
      };

      eventToUpdate.comments = [newComment, ...(eventToUpdate.comments || [])]; // Yeni yorumu başa ekle
      
      await updateDoc(userDocRef, { events: updatedEvents });

      setUserProfile((prevProfile) => ({
        ...prevProfile,
        events: updatedEvents,
      }));
      handleCommentTextChangeProfile(eventIndex, ""); 

    } catch (error) {
      console.error("Profil sayfasında yorum eklenirken hata:", error);
    }
  };

  const deleteEvent = async (index) => {
    const updatedEvents = [...(userProfile.events || [])];
    updatedEvents.splice(index, 1);
    const userRef = doc(db, "users", currentUserId);
    await updateDoc(userRef, { events: updatedEvents });
    setUserProfile((prev) => ({ ...prev, events: updatedEvents }));
  };

  if (!profileUserId) return <div className="text-white">Kullanıcı bilgisi alınamadı...</div>;
  if (!userProfile) return <div className="text-white">Profil yükleniyor...</div>;

  return (
    <div className="h-full min-w-screen min-h-screen flex justify-center items-start p-6 bg-black">
      <div className="max-w-4xl w-full bg-gray-900 rounded-lg shadow p-6 text-white">
        <div className="flex items-center space-x-8">
          <div>
            <img
              src={userProfile.profilePicture}
              alt=""
              className="w-32 h-32 border rounded-full object-cover"
            />
            {editing && isOwnProfile && (
              <input type="file" onChange={handleFileChange} className="mt-2 p-2 border" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">{userProfile.name}</h2>
              {isOwnProfile ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(!editing)}
                    className="px-4 py-1 border rounded text-sm text-white border-white"
                  >
                    {editing ? "Düzenlemeyi Bitir" : "Profili Düzenle"}
                  </button>
                  {/* ✅ Topluluk Başvurusu Butonu */}
                  <button
                    onClick={() => navigate("/community-register")}
                    className="px-4 py-1 bg-purple-600 rounded text-sm text-white"
                  >
                    Topluluk Başvurusu
                  </button>
                </div>
              ) : (
                <button
                  onClick={isFollowing ? unfollowUser : followUser}
                  className={`px-4 py-1 rounded text-sm ${isFollowing ? "bg-red-600" : "bg-blue-600"}`}
                >
                  {isFollowing ? "Takibi Bırak" : "Takip Et"}
                </button>
              )}
            </div>
            <div className="flex space-x-6 mt-2 text-sm text-gray-300">
              <p><strong>{userProfile.events?.length || 0}</strong> gönderi</p>
              <p className="cursor-pointer" onClick={() => setShowFollowers(!showFollowers)}>
                <strong>{userProfile.followers?.length || 0}</strong> takipçi
              </p>
              <p className="cursor-pointer" onClick={() => setShowFollowing(!showFollowing)}>
                <strong>{userProfile.following?.length || 0}</strong> takip
              </p>
            </div>
            {showFollowers && (
              <div className="mt-2 bg-gray-800 p-2 rounded">
                <p className="font-semibold">Takipçiler:</p>
                <ul className="list-disc list-inside">
                  {followerProfiles.map((user, i) => (
                    <li key={i}>{user.name}</li>
                  ))}
                </ul>
              </div>
            )}
            {showFollowing && (
              <div className="mt-2 bg-gray-800 p-2 rounded">
                <p className="font-semibold">Takip Edilenler:</p>
                <ul className="list-disc list-inside">
                  {followingProfiles.map((user, i) => (
                    <li key={i}>{user.name}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-2 text-gray-300">{userProfile.bio || "Bio boş."}</p>

            {editing && isOwnProfile && (
              <div className="mt-2">
                <input
                  placeholder="Yeni Ad"
                  defaultValue=""
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2 mb-2 border rounded text-white"
                />
                <button onClick={updateName} className="mb-2 px-4 py-2 bg-blue-600 text-white rounded">
                  İsmi Güncelle
                </button>
                <textarea
                  placeholder="Yeni Biografi"
                  defaultValue=""
                  onChange={(e) => setNewBio(e.target.value)}
                  className="w-full p-2 border rounded text-white"
                />
                <button onClick={updateBio} className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded">
                  Biyografi Güncelle
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Etkinlikler */}
        <div className="mt-8 border-t pt-4">
          <h3 className="font-bold text-lg mb-2">Etkinlikler</h3>
          {isOwnProfile && (
            <button
              onClick={() => setShowEventForm(!showEventForm)}
              className="mb-4 px-4 py-2 bg-blue-600 text-white rounded"
            >
              {showEventForm ? "İptal Et" : "Etkinlik Aç"}
            </button>
          )}

          {showEventForm && isOwnProfile && (
            <div className="mb-6">
              <input
                type="text"
                name="title"
                placeholder="Etkinlik Başlığı"
                value={newEvent.title}
                onChange={handleNewEventChange}
                className="w-full p-2 mb-2 border rounded text-white"
              />
              <textarea
                name="description"
                placeholder="Etkinlik Açıklaması"
                value={newEvent.description}
                onChange={handleNewEventChange}
                className="w-full p-2 mb-2 border rounded text-white"
              />
              <div className="mb-2">
                <label htmlFor="eventImage" className="block text-sm font-medium text-gray-300 mb-1">
                  Etkinlik Fotoğrafı (İsteğe bağlı, max 800x600 boyutuna getirilecektir)
                </label>
                <input
                  type="file"
                  id="eventImage"
                  name="eventImage"
                  accept="image/*"
                  onChange={handleEventImageChange}
                  className="w-full p-2 border rounded text-white bg-gray-800 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <input
                type="date"
                name="date"
                value={newEvent.date}
                onChange={handleNewEventChange}
                className="p-2 mb-2 border rounded text-white"
              />
              <input
                type="time"
                name="time"
                value={newEvent.time}
                onChange={handleNewEventChange}
                className="p-2 mb-2 border rounded text-white"
              />
              <input
                type="text"
                name="location"
                placeholder="Etkinlik Yeri"
                value={newEvent.location}
                onChange={handleNewEventChange}
                className="p-2 mb-2 border rounded text-white"
              />
              <button onClick={shareEvent} className="px-4 py-2 bg-green-600 text-white rounded">
                Paylaş
              </button>
            </div>
          )}

          {userProfile?.events?.map((event, index) => (
            <div key={index} className="mt-4 border-t pt-4">
              <h4 className="font-semibold text-white">{event.title}</h4>
              <p className="text-gray-400">{event.date} - {event.time} - {event.location}</p>
              <p className="text-gray-300">{event.description}</p>
              {event.eventImageBase64 && (
                <img src={event.eventImageBase64} alt={event.title || "Etkinlik Görseli"} className="mt-2 w-full max-h-96 object-contain rounded" />
              )}
              {/* Like Button and Count on Profile Page */}
              {currentUserId && ( 
                <div className="mt-3 flex items-center space-x-4">
                  <div className="flex items-center">
                    <button
                      onClick={() => handleLikeOnProfile(index)}
                      className={`mr-1 p-1 rounded-full transition-colors duration-200 ease-in-out \
                                  ${(event.likes && event.likes.includes(currentUserId)) ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-400'}`}
                      aria-label="Beğen"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={(event.likes && event.likes.includes(currentUserId)) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                    <span className="text-sm text-gray-400">
                      {event.likes ? event.likes.length : 0} beğeni
                    </span>
                  </div>

                  {/* Attend Button and Count on Profile Page */}
                  <div className="flex items-center">
                    <button
                      onClick={() => handleAttendOnProfile(index)}
                      className={`mr-1 p-1 rounded-full transition-colors duration-200 ease-in-out \
                                  ${(event.attendees && event.attendees.includes(currentUserId)) ? 'text-green-500 hover:text-green-600' : 'text-gray-400 hover:text-green-400'}`}
                      aria-label="Katıl"
                    >
                      {(event.attendees && event.attendees.includes(currentUserId)) ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>
                    <span className="text-sm text-gray-400">
                      {event.attendees ? event.attendees.length : 0} katılımcı
                    </span>
                  </div>
                </div>
              )}
              {/* Comment Count and Toggle Button - Profile Page */}
              <div className="mt-3">
                <button 
                  onClick={() => toggleCommentsVisibilityProfile(index)}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  {(event.comments ? event.comments.length : 0)} yorum - {visibleCommentsProfile[index] ? 'Gizle' : 'Göster'}
                </button>
              </div>

              {/* Comments Section (Visible when toggled) - Profile Page */}
              {visibleCommentsProfile[index] && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  {currentUserId && (
                    <div className="mb-3 flex">
                      <input 
                        type="text"
                        placeholder="Yorumunuzu yazın..."
                        value={newCommentTextProfile[index] || ''}
                        onChange={(e) => handleCommentTextChangeProfile(index, e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddCommentOnProfile(index)}
                        className="flex-grow p-2 mr-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                      />
                      <button 
                        onClick={() => handleAddCommentOnProfile(index)}
                        className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                        disabled={!(newCommentTextProfile[index] || "").trim()}
                      >
                        Gönder
                      </button>
                    </div>
                  )}
                  {(event.comments && event.comments.length > 0) ? (
                    <ul className="space-y-2">
                      {event.comments.map((comment) => (
                        <li key={comment.timestamp + comment.userId} className="bg-gray-800 p-2 rounded">
                          <div className="flex items-center mb-1">
                            <p className="font-semibold text-sm text-sky-400 mr-2">{comment.userName}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(comment.timestamp).toLocaleString('tr-TR')}
                            </p>
                          </div>
                          <p className="text-sm text-gray-300">{comment.text}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">Henüz yorum yok.</p>
                  )}
                </div>
              )}
              {isOwnProfile && (
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => {
                      setNewEvent(event);
                      setEditingEventIndex(index);
                      setShowEventForm(true);
                    }}
                    className="px-3 py-1 bg-yellow-500 text-white rounded"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => deleteEvent(index)}
                    className="px-3 py-1 bg-red-600 text-white rounded"
                  >
                    Sil
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
