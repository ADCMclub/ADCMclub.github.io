// 🔥 CONFIGURA TU PROYECTO FIREBASE ABAJO:
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_DOMINIO.firebaseapp.com",
  databaseURL: "https://TU_DOMINIO.firebaseio.com",
  projectId: "TU_PROYECTO_ID",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "XXXXXX",
  appId: "TU_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startCallBtn = document.getElementById('startCall');
const joinCallBtn = document.getElementById('joinCall');
const callIdInput = document.getElementById('callId');

let localStream, peerConnection;
const servers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

async function init() {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;

  peerConnection = new RTCPeerConnection(servers);
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      const candidate = event.candidate.toJSON();
      db.ref(`${callIdInput.value}/candidates/${isCaller ? 'caller' : 'callee'}`).push(candidate);
    }
  };
}

let isCaller = false;

startCallBtn.onclick = async () => {
  isCaller = true;
  await init();
  const callRef = db.ref().push();
  callIdInput.value = callRef.key;

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  callRef.set({ offer });

  callRef.on('value', async snapshot => {
    const data = snapshot.val();
    if (!peerConnection.currentRemoteDescription && data?.answer) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
  });

  db.ref(`${callRef.key}/candidates/callee`).on('child_added', snapshot => {
    const candidate = new RTCIceCandidate(snapshot.val());
    peerConnection.addIceCandidate(candidate);
  });
};

joinCallBtn.onclick = async () => {
  isCaller = false;
  await init();
  const callRef = db.ref(callIdInput.value);

  const snapshot = await callRef.once('value');
  const callData = snapshot.val();

  await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  callRef.update({ answer });

  db.ref(`${callIdInput.value}/candidates/caller`).on('child_added', snapshot => {
    const candidate = new RTCIceCandidate(snapshot.val());
    peerConnection.addIceCandidate(candidate);
  });
};
