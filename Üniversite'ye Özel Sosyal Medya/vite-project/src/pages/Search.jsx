import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";

const Search = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      const querySnapshot = await getDocs(collection(db, "users"));
      const users = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllUsers(users);
    };

    fetchUsers();
  }, []);

  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchTerm(value);
    const filtered = allUsers.filter(
      (user) => user.name?.toLowerCase().startsWith(value)
    );
    setFilteredUsers(filtered);
  };

  const handleUserClick = (userId) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <div className="p-6 bg-black min-h-screen text-white">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Kullanıcı Ara</h1>
        <input
          type="text"
          placeholder="Kullanıcı adı gir..."
          value={searchTerm}
          onChange={handleSearch}
          className="w-full p-3 rounded border bg-gray-900 border-gray-700 text-white"
        />

        {searchTerm && (
          <div className="mt-4">
            {filteredUsers.length > 0 ? (
              <ul className="space-y-3">
                {filteredUsers.map((user) => (
                  <li
                    key={user.id}
                    onClick={() => handleUserClick(user.id)}
                    className="p-4 bg-gray-800 rounded hover:bg-gray-700 cursor-pointer"
                  >
                    <div className="flex items-center space-x-4">
                      <img
                        src={user.profilePicture || "/default-avatar.png"}
                        alt="avatar"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <span>{user.name}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">Sonuç bulunamadı.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
