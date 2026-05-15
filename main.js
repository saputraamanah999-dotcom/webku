import { auth, db, googleProvider } from './firebase-config.js';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js';

const googleLoginBtn = document.getElementById('googleLoginBtn');
const developerDemoBtn = document.getElementById('developerDemoBtn');
const developerLoginForm = document.getElementById('developerLoginForm');
const authMessage = document.getElementById('authMessage');

const roleRoutes = {
  siswa: 'student.html',
  guru: 'teacher.html',
  wali: 'guardian.html',
  osis: 'osis.html',
  bendahara: 'treasurer.html',
  developer: 'developer.html'
};

function showMessage(msg, isError = false) {
  authMessage.textContent = msg;
  authMessage.style.color = isError ? '#ff6f91' : '#18e1b9';
}

async function ensureUserProfile(user, defaultRole = 'siswa') {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      namaLengkap: user.displayName || 'Siswa Baru',
      kelas: 'X',
      jurusan: 'RPL',
      role: defaultRole,
      active: true,
      dibuatPada: serverTimestamp()
    });
    return { role: defaultRole };
  }
  return snap.data();
}

function redirectByRole(role) {
  const route = roleRoutes[role] || roleRoutes.siswa;
  window.location.href = route;
}

googleLoginBtn?.addEventListener('click', async () => {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    const profile = await ensureUserProfile(res.user, 'siswa');
    showMessage('Login berhasil. Mengarahkan dashboard...');
    redirectByRole(profile.role);
  } catch (error) {
    showMessage(`Gagal login Gmail: ${error.message}`, true);
  }
});

developerDemoBtn?.addEventListener('click', () => {
  developerLoginForm.classList.toggle('hidden');
});

developerLoginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('devEmail').value;
  const password = document.getElementById('devPassword').value;

  try {
    const res = await signInWithEmailAndPassword(auth, email, password);
    await ensureUserProfile(res.user, 'developer');
    const userRef = doc(db, 'users', res.user.uid);
    await setDoc(userRef, { role: 'developer' }, { merge: true });
    showMessage('Login developer berhasil.');
    redirectByRole('developer');
  } catch (error) {
    showMessage(`Login developer gagal: ${error.message}`, true);
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  try {
    const profile = await ensureUserProfile(user, 'siswa');
    redirectByRole(profile.role);
  } catch {
    // tetap di halaman login bila gagal ambil profile
  }
});
