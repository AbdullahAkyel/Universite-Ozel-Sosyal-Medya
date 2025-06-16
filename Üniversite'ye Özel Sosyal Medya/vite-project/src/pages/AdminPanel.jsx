import { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

const AdminPanel = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchApplications = async () => {
    setLoading(true);
    const snapshot = await getDocs(collection(db, "communityApplications"));
    const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setApplications(apps);
    setLoading(false);
  };

  const updateStatus = async (id, newStatus) => {
    const appRef = doc(db, "communityApplications", id);
    await updateDoc(appRef, { status: newStatus });
    fetchApplications(); // Güncel listeyi yeniden al
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  if (loading) return <p>Yükleniyor...</p>;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Topluluk Başvuruları</h1>
      {applications.map(app => (
        <div key={app.id} className="border p-4 rounded shadow space-y-2">
          <div className="flex items-center gap-4">
            {app.logo && <img src={app.logo} alt="logo" className="w-16 h-16 rounded-full" />}
            <div>
              <h2 className="text-xl font-semibold">{app.name}</h2>
              <p>{app.description}</p>
              <p className="text-sm text-gray-500">Durum: {app.status}</p>
            </div>
          </div>

          {app.status === "pending" && (
            <div className="flex gap-2">
              <button
                onClick={() => updateStatus(app.id, "approved")}
                className="bg-green-500 text-white px-4 py-1 rounded"
              >
                Onayla
              </button>
              <button
                onClick={() => updateStatus(app.id, "rejected")}
                className="bg-red-500 text-white px-4 py-1 rounded"
              >
                Reddet
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AdminPanel;
