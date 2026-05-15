import { auth, db, storage } from './firebase-config.js';
import {
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js';
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  orderBy,
  limit
} from 'https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js';
import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'https://www.gstatic.com/firebasejs/11.7.3/firebase-storage.js';

const rolePage = document.body.dataset.role;
const userNameEl = document.getElementById('userName');
const userRoleEl = document.getElementById('userRole');
const nowClockEl = document.getElementById('nowClock');
const notifArea = document.getElementById('notifArea');
const logoutBtn = document.getElementById('logoutBtn');

function tickClock() {
  const now = new Date();
  nowClockEl.textContent = now.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' });
}
setInterval(tickClock, 1000);
tickClock();

function renderNotification(profile) {
  const hour = new Date().getHours();
  let message = 'Selamat belajar!';

  if (profile?.role === 'siswa') {
    if ((profile.kelas || '').startsWith('X') && hour >= 12) {
      message = 'Pengingat: kelas 10 masuk sore, jangan lupa absensi sebelum jam masuk.';
    } else if ((profile.kelas || '').startsWith('XI') || (profile.kelas || '').startsWith('XII')) {
      message = 'Pengingat: kelas 11/12 sesi pagi, pastikan absen sebelum 07:00 WITA.';
    }
  }
  notifArea.textContent = message;
}

async function loadStats(uid, role) {
  const statAttend = document.getElementById('statAttend');
  const statPermit = document.getElementById('statPermit');
  const statViolation = document.getElementById('statViolation');

  if (!statAttend) return;

  if (role === 'siswa') {
    const qAttend = query(collection(db, 'attendance'), where('uid', '==', uid));
    const qPermit = query(collection(db, 'permissions'), where('uid', '==', uid));
    const qViolation = query(collection(db, 'violations'), where('uid', '==', uid));

    const [a, p, v] = await Promise.all([getDocs(qAttend), getDocs(qPermit), getDocs(qViolation)]);
    statAttend.textContent = a.size;
    statPermit.textContent = p.size;
    statViolation.textContent = v.size;
  } else {
    const [a, p, v] = await Promise.all([
      getDocs(collection(db, 'attendance')),
      getDocs(collection(db, 'permissions')),
      getDocs(collection(db, 'violations'))
    ]);
    statAttend.textContent = a.size;
    statPermit.textContent = p.size;
    statViolation.textContent = v.size;
  }
}

async function loadRecentTable() {
  const tableBody = document.getElementById('recentTableBody');
  if (!tableBody) return;

  const q = query(collection(db, 'permissions'), orderBy('dibuatPada', 'desc'), limit(8));
  const snap = await getDocs(q);
  tableBody.innerHTML = '';

  snap.forEach((d) => {
    const item = d.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.namaLengkap || '-'}</td>
      <td>${item.kategori || '-'}</td>
      <td>${item.kelas || '-'}</td>
      <td><span class="status ${item.status === 'disetujui' ? 'ok' : item.status === 'ditolak' ? 'bad' : 'wait'}">${item.status || 'menunggu'}</span></td>
    `;
    tableBody.appendChild(tr);
  });
}

async function bindForms(user, profile) {
  const attendanceForm = document.getElementById('attendanceForm');
  const permitForm = document.getElementById('permitForm');
  const violationForm = document.getElementById('violationForm');
  const profileForm = document.getElementById('profileForm');

  attendanceForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = attendanceForm.statusKehadiran.value;
    await addDoc(collection(db, 'attendance'), {
      uid: user.uid,
      namaLengkap: profile.namaLengkap,
      kelas: profile.kelas,
      jurusan: profile.jurusan,
      status,
      rolePengirim: profile.role,
      dibuatPada: serverTimestamp()
    });
    alert('Absensi terkirim.');
    attendanceForm.reset();
    await loadStats(user.uid, profile.role);
  });

  permitForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = permitForm.suratFile.files[0];
    let suratUrl = '';

    if (file) {
      const storageRef = ref(storage, `surat/${user.uid}/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file);
      suratUrl = await getDownloadURL(storageRef);
    }

    await addDoc(collection(db, 'permissions'), {
      uid: user.uid,
      namaLengkap: profile.namaLengkap,
      kelas: permitForm.kelas.value,
      jurusan: permitForm.jurusan.value,
      kategori: permitForm.kategori.value,
      detail: permitForm.detail.value,
      tujuan: permitForm.tujuan.value,
      suratUrl,
      status: 'menunggu',
      dibuatPada: serverTimestamp()
    });
    alert('Pengajuan izin berhasil dikirim ke guru.');
    permitForm.reset();
    await loadRecentTable();
    await loadStats(user.uid, profile.role);
  });

  violationForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'violations'), {
      uid: violationForm.uidSiswa.value || 'manual-osis',
      namaLengkap: violationForm.namaLengkap.value,
      kelas: violationForm.kelas.value,
      jurusan: violationForm.jurusan.value,
      jenisPelanggaran: violationForm.jenisPelanggaran.value,
      catatan: violationForm.catatan.value,
      dibuatOleh: profile.namaLengkap,
      rolePembuat: profile.role,
      dibuatPada: serverTimestamp()
    });
    alert('Data pelanggaran/temuan OSIS tersimpan.');
    violationForm.reset();
    await loadStats(user.uid, profile.role);
  });

  profileForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await setDoc(doc(db, 'users', user.uid), {
      namaLengkap: profileForm.namaLengkap.value,
      kelas: profileForm.kelas.value,
      jurusan: profileForm.jurusan.value
    }, { merge: true });
    alert('Profil diperbarui.');
  });
}

async function enforceRole(profile) {
  const allowed = rolePage === 'shared' || profile.role === rolePage || (rolePage === 'guardian' && ['wali', 'ketua-kelas', 'sekretaris'].includes(profile.role));
  if (!allowed) {
    window.location.href = `${profile.role}.html`;
  }
}

logoutBtn?.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'index.html';
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  const snap = await getDoc(doc(db, 'users', user.uid));
  const profile = snap.data();

  await enforceRole(profile);
  userNameEl.textContent = profile.namaLengkap || user.displayName || user.email;
  userRoleEl.textContent = `Role: ${profile.role}`;
  renderNotification(profile);

  const classEl = document.getElementById('classText');
  if (classEl) classEl.textContent = `${profile.kelas || '-'} • ${profile.jurusan || '-'}`;

  const pfName = document.querySelector('#profileForm [name="namaLengkap"]');
  if (pfName) {
    pfName.value = profile.namaLengkap || '';
    document.querySelector('#profileForm [name="kelas"]').value = profile.kelas || '';
    document.querySelector('#profileForm [name="jurusan"]').value = profile.jurusan || '';
  }

  await bindForms(user, profile);
  await loadStats(user.uid, profile.role);
  await loadRecentTable();
});
