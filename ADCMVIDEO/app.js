<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mini Zoom WebRTC + Firebase</title>
  <style>
    video {
      width: 45%;
      margin: 10px;
      border: 1px solid #444;
    }
    #controls {
      margin: 10px;
    }
    input, button {
      padding: 6px;
      margin: 4px;
    }
  </style>
</head>
<body>
  <h1>Mini Zoom WebRTC + Firebase</h1>
  <video id="localVideo" autoplay muted playsinline></video>
  <video id="remoteVideo" autoplay playsinline></video>

  <div id="controls">
    <button id="startCall">Crear llamada</button>
    <input type="text" id="callId" placeholder="ID de llamada" />
    <button id="joinCall">Unirse a llamada</button>
  </div>

  <!-- Firebase SDK -->
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>

  <script>
    // --- Configuración Firebase (reemplaza con tu configuración) ---
    const firebaseConfig = {
      apiKey: "TU_API_KEY",
      authDomain: "TU_DOMINIO.firebaseapp.com",
      databaseURL: "https://TU_DOMINIO.firebaseio.com",
      projectId: "TU_PROYECTO_ID",
      storageBucket: "TU_PROYECTO.appspot.com",
      messagingSenderId: "TU_SENDER_ID",
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
    let isCaller = false;
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
          const role = isCaller ? 'caller' : 'callee';
          console.log(`Enviando ICE candidate (${role}):`, event.candidate);
          db.ref(`${callIdInput.value}/candidates/${role}`).push(event.candidate.toJSON());
        }
      };
    }

    startCallBtn.onclick = async () => {
      isCaller = true;
      await init();
      const callRef = db.ref().push();
      callIdInput.value = callRef.key;

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      console.log("Oferta creada:", offer);
      await callRef.set({ offer: offer.toJSON() });

      callRef.on('value', async snapshot => {
        const data = snapshot.val();
        if (!peerConnection.currentRemoteDescription && data?.answer) {
          console.log("Respuesta recibida:", data.answer);
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      });

      db.ref(`${callRef.key}/candidates/callee`).on('child_added', snapshot => {
        const candidate = new RTCIceCandidate(snapshot.val());
        console.log("Candidate remoto (callee):", candidate);
        await peerConnection.addIceCandidate(candidate);
      });
    };

    joinCallBtn.onclick = async () => {
      isCaller = false;
      await init();
      const callRef = db.ref(callIdInput.value);

      const snapshot = await callRef.once('value');
      const callData = snapshot.val();

      console.log("Oferta recibida:", callData.offer);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer));

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      console.log("Respuesta creada:", answer);
      await callRef.update({ answer: answer.toJSON() });

      db.ref(`${callIdInput.value}/candidates/caller`).on('child_added', snapshot => {
        const candidate = new RTCIceCandidate(snapshot.val());
        console.log("Candidate remoto (caller):", candidate);
        peerConnection.addIceCandidate(candidate);
      });
    };
  </script>
</body>
</html>
