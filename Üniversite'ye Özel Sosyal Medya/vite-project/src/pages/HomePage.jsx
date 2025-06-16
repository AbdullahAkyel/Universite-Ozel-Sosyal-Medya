import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { collection, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db, auth } from "../firebase/firebase";

const HomePage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleComments, setVisibleComments] = useState({});
  const [newCommentText, setNewCommentText] = useState({});
  const currentUser = auth.currentUser;
  const currentUserId = currentUser?.uid;

  useEffect(() => {
    const fetchFollowedUsersEvents = async () => {
      if (!currentUserId) return;

      try {
        const currentUserDoc = await getDoc(doc(db, "users", currentUserId));
        const following = currentUserDoc.data()?.following || [];

        let allEvents = [];

        for (const followedId of following) {
          const followedUserDoc = await getDoc(doc(db, "users", followedId));

          if (followedUserDoc.exists()) {
            const followedUserData = followedUserDoc.data();
            const userEvents = followedUserData.events || [];

            userEvents.forEach((event, eventIndex) => {
              allEvents.push({
                ...event,
                originalUserId: followedId,
                originalEventIndex: eventIndex,
                userName: followedUserData.name || "Bilinmeyen",
                profilePicture: followedUserData.profilePicture || null,
              });
            });
          }
        }
        allEvents.sort((a, b) => new Date(b.sharedAt || 0) - new Date(a.sharedAt || 0));
        setEvents(allEvents);
      } catch (error) {
        console.error("Etkinlikleri alırken hata:", error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUserId) {
      fetchFollowedUsersEvents();
    } else {
      setLoading(false);
      setEvents([]);
    }
  }, [currentUserId]);

  const handleLike = async (eventToLike) => {
    console.log("handleLike triggered for event:", JSON.parse(JSON.stringify(eventToLike)));
    if (!currentUserId || !eventToLike || eventToLike.originalUserId === undefined || eventToLike.originalEventIndex === undefined) {
      console.error("Beğeni işlemi için kullanıcı ID, etkinlik veya etkinlik sahibi ID/index eksik. Event:", JSON.parse(JSON.stringify(eventToLike)), "CurrentUserID:", currentUserId);
      return;
    }
    console.log("Attempting to like event owned by:", eventToLike.originalUserId, "at index:", eventToLike.originalEventIndex);

    const userDocRef = doc(db, "users", eventToLike.originalUserId);
    console.log("UserDocRef path:", userDocRef.path);

    try {
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        console.error("Etkinlik sahibi kullanıcı bulunamadı. Path:", userDocRef.path);
        return;
      }

      const userData = userDocSnap.data();
      console.log("Owner user data:", JSON.parse(JSON.stringify(userData)));
      const userEvents = JSON.parse(JSON.stringify(userData.events || [])); // Derin kopya
      
      const targetEventIndex = userEvents.findIndex(
        (e, index) => index === eventToLike.originalEventIndex && e.sharedAt === eventToLike.sharedAt
      );
      console.log("Target event index found for LIKE:", targetEventIndex);
      if (targetEventIndex !== -1) {
        console.log("Target event object (before like action):", JSON.parse(JSON.stringify(userEvents[targetEventIndex])));
      }

      if (targetEventIndex === -1) {
        console.error("Hedef etkinlik (LIKE için) kullanıcının etkinlikleri arasında bulunamadı. Index:", eventToLike.originalEventIndex, "Target SharedAt:", eventToLike.sharedAt, "User's Events:", JSON.parse(JSON.stringify(userEvents)));
        return; 
      }
      
      const eventToUpdateInArray = userEvents[targetEventIndex];
      const eventLikes = eventToUpdateInArray.likes || [];
      const userHasLiked = eventLikes.includes(currentUserId);
      console.log("User has liked?", userHasLiked, "Current likes:", JSON.parse(JSON.stringify(eventLikes)));

      if (userHasLiked) {
        eventToUpdateInArray.likes = eventLikes.filter(id => id !== currentUserId);
      } else {
        eventToUpdateInArray.likes = [...eventLikes, currentUserId];
      }
      console.log("Updated likes for target event in JS array:", JSON.parse(JSON.stringify(eventToUpdateInArray.likes)));
      console.log("User events array to be updated in Firestore (LIKE):", JSON.parse(JSON.stringify(userEvents)));
      
      await updateDoc(userDocRef, { events: userEvents });
      console.log("Firestore update successful for like/unlike.");

      setEvents((prevEvents) =>
        prevEvents.map((e) =>
          e.sharedAt === eventToLike.sharedAt && e.originalUserId === eventToLike.originalUserId
            ? { ...e, likes: eventToUpdateInArray.likes } // Güncellenmiş likes'ı kullan
            : e
        )
      );
    } catch (error) {
      console.error("Beğeni güncellenirken hata:", error, "For event:", JSON.parse(JSON.stringify(eventToLike)));
    }
  };

  const handleAttend = async (eventToAttend) => {
    console.log("handleAttend triggered for event:", JSON.parse(JSON.stringify(eventToAttend)));
    if (!currentUserId || !eventToAttend || eventToAttend.originalUserId === undefined || eventToAttend.originalEventIndex === undefined) {
      console.error("Katılım işlemi için kullanıcı ID, etkinlik veya etkinlik sahibi ID/index eksik. Event:", JSON.parse(JSON.stringify(eventToAttend)), "CurrentUserID:", currentUserId);
      return;
    }
    console.log("Attempting to attend event owned by:", eventToAttend.originalUserId, "at index:", eventToAttend.originalEventIndex);

    const userDocRef = doc(db, "users", eventToAttend.originalUserId);
    console.log("UserDocRef path (Attend):", userDocRef.path);

    try {
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        console.error("Etkinlik sahibi kullanıcı bulunamadı (Attend). Path:", userDocRef.path);
        return;
      }

      const userData = userDocSnap.data();
      console.log("Owner user data (Attend):", JSON.parse(JSON.stringify(userData)));
      const userEvents = JSON.parse(JSON.stringify(userData.events || [])); // Derin kopya
      
      const targetEventIndex = userEvents.findIndex(
        (e, index) => index === eventToAttend.originalEventIndex && e.sharedAt === eventToAttend.sharedAt
      );
      console.log("Target event index found for ATTEND:", targetEventIndex);
      if (targetEventIndex !== -1) {
        console.log("Target event object (before attend action):", JSON.parse(JSON.stringify(userEvents[targetEventIndex])));
      }

      if (targetEventIndex === -1) {
        console.error("Hedef etkinlik (ATTEND için) kullanıcının etkinlikleri arasında bulunamadı. Index:", eventToAttend.originalEventIndex, "Target SharedAt:", eventToAttend.sharedAt, "User's Events:", JSON.parse(JSON.stringify(userEvents)));
        return; 
      }
      
      const eventToUpdateInArray = userEvents[targetEventIndex];
      const eventAttendees = eventToUpdateInArray.attendees || [];
      const userHasAttended = eventAttendees.includes(currentUserId);
      console.log("User has attended?", userHasAttended, "Current attendees:", JSON.parse(JSON.stringify(eventAttendees)));

      if (userHasAttended) {
        eventToUpdateInArray.attendees = eventAttendees.filter(id => id !== currentUserId);
      } else {
        eventToUpdateInArray.attendees = [...eventAttendees, currentUserId];
      }
      console.log("Updated attendees for target event in JS array:", JSON.parse(JSON.stringify(eventToUpdateInArray.attendees)));
      console.log("User events array to be updated in Firestore (ATTEND):", JSON.parse(JSON.stringify(userEvents)));

      await updateDoc(userDocRef, { events: userEvents });
      console.log("Firestore update successful for attend/unattend.");

      setEvents((prevEvents) =>
        prevEvents.map((e) =>
          e.sharedAt === eventToAttend.sharedAt && e.originalUserId === eventToAttend.originalUserId
            ? { ...e, attendees: eventToUpdateInArray.attendees } // Güncellenmiş attendees'i kullan
            : e
        )
      );
    } catch (error) {
      console.error("Katılım güncellenirken hata:", error, "For event:", JSON.parse(JSON.stringify(eventToAttend)));
    }
  };

  const toggleCommentsVisibility = (eventSharedAt) => {
    setVisibleComments(prev => ({
      ...prev,
      [eventSharedAt]: !prev[eventSharedAt]
    }));
  };

  const handleCommentTextChange = (eventSharedAt, text) => {
    setNewCommentText(prev => ({
      ...prev,
      [eventSharedAt]: text
    }));
  };

  const handleAddComment = async (eventToAddCommentTo) => {
    const { originalUserId, originalEventIndex, sharedAt } = eventToAddCommentTo;
    const commentText = (newCommentText[sharedAt] || "").trim();

    if (!currentUserId || !commentText) {
      console.error("Yorum eklemek için kullanıcı girişi yapılmalı ve yorum metni boş olmamalıdır.");
      return;
    }
    if (originalUserId === undefined || originalEventIndex === undefined) {
      console.error("Yorum eklenecek etkinlik için sahip ID veya index eksik.");
      return;
    }

    const userDocRef = doc(db, "users", originalUserId);

    try {
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        console.error("Etkinlik sahibi kullanıcı bulunamadı (yorum).");
        return;
      }

      const userData = userDocSnap.data();
      const userEvents = [...(userData.events || [])];
      
      const targetEventIndex = userEvents.findIndex(
        (e, index) => index === originalEventIndex && e.sharedAt === sharedAt
      );

      if (targetEventIndex === -1) {
        console.error("Hedef etkinlik (yorum için) bulunamadı.");
        return; 
      }
      
      const newComment = {
        userId: currentUserId,
        userName: currentUser.displayName || currentUser.email || "Bilinmeyen Kullanıcı",
        text: commentText,
        timestamp: new Date().toISOString(),
      };

      const updatedComments = [newComment, ...(userEvents[targetEventIndex].comments || [])];
      userEvents[targetEventIndex].comments = updatedComments;
      
      await updateDoc(userDocRef, { events: userEvents });

      setEvents((prevEvents) =>
        prevEvents.map((e) =>
          e.sharedAt === sharedAt && e.originalUserId === originalUserId
            ? { ...e, comments: updatedComments }
            : e
        )
      );
      handleCommentTextChange(sharedAt, "");

    } catch (error) {
      console.error("Yorum eklenirken hata:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Takip Ettiklerinin Etkinlikleri</h1>

      {events.length === 0 ? (
        <p className="text-center text-gray-400">Henüz takip ettiğiniz kullanıcıların bir paylaşımı yok.</p>
      ) : (
        <div className="flex flex-col gap-6 max-w-2xl mx-auto">
          {events.map((event, index) => (
            <div key={index} className="bg-gray-900 p-4 rounded-lg shadow">
              <div className="flex items-center gap-3 mb-2">
                {event.profilePicture && (
                  <img
                    src={event.profilePicture}
                    alt="pp"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="font-medium">{event.userName}</p>
                  <p className="text-sm text-gray-400">
                    {event.date} - {event.time}
                  </p>
                </div>
              </div>

              <h2 className="text-lg font-semibold">{event.title}</h2>
              <p className="text-gray-300">{event.description}</p>

              {(event.imageUrl || event.eventImageBase64) && (
                <img
                  src={event.imageUrl || event.eventImageBase64}
                  alt="Etkinlik görseli"
                  className="mt-3 w-full max-h-64 object-cover rounded"
                />
              )}

              <p className="mt-2 text-sm text-gray-400">📍 {event.location}</p>
              <div className="mt-3 flex items-center space-x-4">
                <div className="flex items-center">
                  <button
                    onClick={() => handleLike(event)}
                    className={`mr-1 p-1 rounded-full transition-colors duration-200 ease-in-out 
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

                {currentUserId && (
                  <div className="flex items-center">
                    <button
                      onClick={() => handleAttend(event)}
                      className={`mr-1 p-1 rounded-full transition-colors duration-200 ease-in-out 
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
                )}
              </div>

              <div className="mt-3">
                <button 
                  onClick={() => toggleCommentsVisibility(event.sharedAt)}
                  className="text-sm text-white hover:text-gray-300"
                >
                  {event.comments ? event.comments.length : 0} yorum - {visibleComments[event.sharedAt] ? 'Gizle' : 'Göster'}
                </button>
              </div>

              {visibleComments[event.sharedAt] && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  {currentUserId && (
                    <div className="mb-3 flex">
                      <input 
                        type="text"
                        placeholder="Yorumunuzu yazın..."
                        value={newCommentText[event.sharedAt] || ''}
                        onChange={(e) => handleCommentTextChange(event.sharedAt, e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddComment(event)}
                        className="flex-grow p-2 mr-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                      />
                      <button 
                        onClick={() => handleAddComment(event)}
                        className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-gray-700 disabled:opacity-50"
                        disabled={!(newCommentText[event.sharedAt] || "").trim()}
                      >
                        Gönder
                      </button>
                    </div>
                  )}
                  {(event.comments && event.comments.length > 0) ? (
                    <ul className="space-y-2">
                      {event.comments.map((comment, commentIndex) => (
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HomePage;
