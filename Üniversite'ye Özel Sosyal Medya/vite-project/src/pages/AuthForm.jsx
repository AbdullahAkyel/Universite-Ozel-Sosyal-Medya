import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { signInWithGoogle } from '../firebase/authService';

const AuthForm = () => {
  const [isSignUp, setIsSignUp] = useState(true);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.warn("Manuel form gönderimi (e-posta/şifre) devre dışı bırakıldı.");
  };

  const handleGoogleLogin = async () => {
    console.log("isSignUp değeri:", isSignUp); // Bunu test için ekle
    try {
      const user = await signInWithGoogle(isSignUp);
      const emailDomain = user.email.split('@')[1];

      navigate("/home");
  
      if (!emailDomain.includes('giresun.edu.tr')) {
        alert('Lütfen Giresun Üniversitesi öğrenci e-posta adresinizi kullanın.');
        const { getAuth, signOut } = await import('firebase/auth');
        await signOut(getAuth());
      }
    } catch (error) {
      alert(error.message);
    }
  };
  
  return (
    <div className="flex justify-center h- items-center">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg w-96 space-y-6">
        <h2 className="text-2xl font-bold text-center text-gray-700">
          {isSignUp ? 'Yeni Hesap Oluştur' : 'Giriş Yap'}
        </h2>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 py-2 bg-white border border-gray-300 text-white font-semibold rounded-md shadow-sm hover:shadow-md transition duration-200"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google logo"
            className="w-5 h-5"
          />
          Google ile {isSignUp ? 'Kayıt Ol' : 'Giriş Yap'}
        </button>

        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full py-2 bg-gray-200 text-white font-semibold rounded-md hover:bg-gray-300 transition duration-200"
        >
          {isSignUp ? 'Zaten üye misiniz? Giriş Yap' : 'Yeni hesap oluştur'}
        </button>
      </form>
    </div>
  );
};

export default AuthForm;