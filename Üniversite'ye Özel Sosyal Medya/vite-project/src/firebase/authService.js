import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { getAuth, signOut } from "firebase/auth";


// Kayıt olma fonksiyonu (email/şifre)
export const signUp = async (email, password, name, role = "user") => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Firestore'a kullanıcıyı kaydet
    await setDoc(doc(db, "users", user.uid), {
      name: name,
      bio: "",
      profilePicture: "",
      followers: [],
      following: [],
      events: [],
      email,
      role,
    });

    console.log("Kayıt başarılı:", user);
  } catch (error) {
    console.error("Kayıt hatası:", error.message);
  }
};

// Giriş yapma fonksiyonu (email/şifre)
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Giriş başarılı!", userCredential.user);
  } catch (error) {
    console.error("Giriş hatası:", error.message);
  }
};

// Google ile giriş fonksiyonu
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const emailDomain = user.email.split('@')[1];
    const authInstance = auth; // zaten import ettin

    // GEÇERSİZ DOMAİNSE: Hemen oturumu kapat, kullanıcıyı da sil (auth'dan)
    if (!emailDomain.includes('giresun.edu.tr')) {
      alert("Lütfen Giresun Üniversitesi öğrenci e-posta adresinizi kullanın.");
      await user.delete(); // Firebase Authentication'dan tamamen sil
      await signOut(authInstance);
      throw new Error('Geçersiz e-posta adresi. Giriş engellendi.');
    }

    // Firestore kontrolü ve kayıt işlemi
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        name: user.displayName || "",
        bio: "",
        profilePicture: user.photoURL || "",
        followers: [],
        following: [],
        events: [],
        email: user.email,
        role: "user",
      });

      console.log("Google ile yeni kullanıcı kaydedildi:", user);
    } else {
      console.log("Google ile giriş yapıldı (kayıtlı kullanıcı):", user);
    }

    return user;
  } catch (error) {
    console.error("Google giriş hatası:", error.message);
    throw error;
  }
};









// import { auth, db } from "./firebase";
// import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
// import { setDoc, doc } from "firebase/firestore";

// // Kayıt olma fonksiyonu (Yeni kullanıcıyı Firestore'a ekler)
// export const signUp = async (email, password, name, role = "user") => {
//   try {
//     const userCredential = await createUserWithEmailAndPassword(auth, email, password);
//     const user = userCredential.user;

//     // Firestore'a kullanıcıyı kaydet
//     await setDoc(doc(db, "users", user.uid), {
//       name: name,
//       bio: "",
//       profilePicture: "",
//       followers: [],
//       following: [],
//       events: [],
//       email,
//       role, // Varsayılan olarak "user", admin kaydı manuel yapılır
//     });

//     console.log("Kayıt başarılı:", user);
//   } catch (error) {
//     console.error("Kayıt hatası:", error.message);
//   }
// };

// // Giriş yapma fonksiyonu
// export const signIn = async (email, password) => {
//   try {
//     const userCredential = await signInWithEmailAndPassword(auth, email, password);
//     console.log("Giriş başarılı!", userCredential.user);
//   } catch (error) {
//     console.error("Giriş hatası:", error.message);
//   }
// };
