/* Configuration publique de Firebase Web pour PrintPilot 3D.
   Ne pas y mettre de mots de passe ou de cles privees. */
window.PRINTPILOT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAblMDwrhKPXWOhvjd8IO5DxI9OwyfUc1M",
  authDomain: "printpilot-3d.firebaseapp.com",
  projectId: "printpilot-3d",
  storageBucket: "printpilot-3d.firebasestorage.app",
  messagingSenderId: "1039447948278",
  appId: "1:1039447948278:web:97dd2bd97d9dd17ce765d7",
  measurementId: "G-SZ4BYNHT3X"
};

// Firebase Console → Project settings → Cloud Messaging → Web Push certificates → Public key.
// Cle publique seulement, jamais une cle privee ou un fichier de service account.
window.JJ3D_WEB_PUSH_VAPID_PUBLIC_KEY = "BHfk4-HHTQSzoxgrHtr4I--j44r4JlqUe44xKs3BGphJ3pHc_ne04wFzLFq6O2tPnH8tlqgMEQrsRy6O2bjrOHc";
