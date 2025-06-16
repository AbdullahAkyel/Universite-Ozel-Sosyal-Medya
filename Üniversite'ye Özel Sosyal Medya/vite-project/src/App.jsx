import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import AuthForm from "./pages/AuthForm";
import HomePage from "./pages/HomePage";
import AdminPanel from "./pages/AdminPanel";
import ProfilePage from "./pages/ProfilePage";
import Search from "./pages/Search";
import CommunityRegister from "./pages/CommunityRegister";
import { auth, db } from "./firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useLocation, useNavigate } from "react-router-dom";

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const isOnHomePage = currentPath === "/home";
  const isOnProfilePage = currentPath === "/profile/:userId";
  const isOnAuthPage = currentPath === "/"; // 👈 Yeni: Auth ekranında mıyız?

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userRole = userDoc.data().role;
          console.log("Kullanıcı rolü:", userRole);
          setRole(userRole);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );

  return (
    <div className="min-h-screen flex-col bg-gray">
      <div className="w-full flex justify-between items-start">
        {/* Navbar */}
        {!isOnAuthPage && (
          <div className="w-full p-4 bg-gray-900 shadow-md">
            <div className="flex justify-between items-start">
              {isOnHomePage ? (
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded-md"
                  onClick={() => navigate("/profile")}
                >
                  Profil
                </button>
              ) : (
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded-md"
                  onClick={() => navigate("/home")}
                >
                  Ana Sayfa
                </button>
              )}

              <button
                className="px-4 py-2 bg-green-500 text-white rounded-md"
                onClick={() => navigate("/search")}
              >
                Kullanıcı Ara
              </button>

              {user && (
                <button
                  className="px-4 py-2 bg-red-500 text-white rounded-md"
                  onClick={() => signOut(auth)}
                >
                  Çıkış Yap
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sayfa içerikleri */}
      <div className="w-full min-h-screen flex justify-center items-center">
        <Routes>
          <Route
            path="/"
            element={
              !user ? (
                <AuthForm />
              ) : role === "admin" ? (
                <Navigate to="/admin" />
              ) : role === "user" ? (
                <Navigate to="/home" />
              ) : (
                <div>Yükleniyor...</div>
              )
            }
          />
          <Route
            path="/home"
            element={user ? <HomePage /> : <Navigate to="/" />}
          />
          <Route
            path="/admin"
            element={user && role === "admin" ? <AdminPanel /> : <Navigate to="/" />}
          />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:userId" element={user ? <ProfilePage /> : <Navigate to="/" />} />

          <Route
            path="/search"
            element={user ? <Search /> : <Navigate to="/" />}
          />
          <Route path="/community-register" element={<CommunityRegister />} />
        </Routes>
      </div>
    </div>
  );

}

export default App;
