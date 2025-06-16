import React, { useState } from "react";
import { db, auth, storage } from "../firebase/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";

const CommunityRegister = () => {
    const [communityName, setCommunityName] = useState("");
    const [description, setDescription] = useState("");
    const [socialLink, setSocialLink] = useState("");
    const [logoFile, setLogoFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [documentFile, setDocumentFile] = useState(null);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let logoURL = "";
            if (logoFile) {
                const storageRef = ref(storage, `community-logos/${Date.now()}_${logoFile.name}`);
                await uploadBytes(storageRef, logoFile);
                logoURL = await getDownloadURL(storageRef);
            }
            let documentURL = "";
            if (documentFile) {
                const docRef = ref(storage, `community-documents/${Date.now()}_${documentFile.name}`);
                await uploadBytes(docRef, documentFile);
                documentURL = await getDownloadURL(docRef);
            }


            await addDoc(collection(db, "communityApplications"), {
                name: communityName,
                description,
                document: documentURL,
                createdBy: auth.currentUser.uid,
                createdAt: serverTimestamp(),
                status: "pending",
            });

            alert("Topluluk başvurusu başarıyla gönderildi!");
            navigate("/profile"); // İstersen yönlendirmeyi değiştir
        } catch (error) {
            console.error("Başvuru hatası:", error);
            alert("Bir hata oluştu. Lütfen tekrar deneyin.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white p-6">
            <form
                onSubmit={handleSubmit}
                className="bg-gray-900 p-8 rounded-lg shadow-lg w-full max-w-xl space-y-4"
            >
                <h2 className="text-2xl font-bold text-center">Topluluk Başvurusu</h2>

                <input
                    type="text"
                    placeholder="Topluluk Adı"
                    value={communityName}
                    onChange={(e) => setCommunityName(e.target.value)}
                    required
                    className="w-full p-2 rounded bg-gray-800 border border-gray-600"
                />

                <textarea
                    placeholder="Açıklama"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={4}
                    className="w-full p-2 rounded bg-gray-800 border border-gray-600"
                />

                <label className="block mb-4 text-sm font-medium text-gray-700">
                    Başvuru Belgesi (PDF, DOCX vs.)
                    <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setDocumentFile(e.target.files[0])}
                        className="mt-1 block w-full border border-gray-300 rounded p-2"
                    />
                </label>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-700 p-2 rounded text-white font-semibold"
                >
                    {loading ? "Gönderiliyor..." : "Başvuruyu Gönder"}
                </button>
            </form>
        </div>
    );
};

export default CommunityRegister;
