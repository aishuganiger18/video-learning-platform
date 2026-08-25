import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

// ==========================================
// SOCKET.IO CONNECTION
// ==========================================

const socket = io(
  "https://video-conference-unek.onrender.com",
  {
    transports: ["websocket", "polling"],
  }
);

const ROOM_ID = "video-room";

// ==========================================
// WEBRTC CONFIGURATION
// ==========================================

const peerConfig = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

function App() {
  // ========================================
  // REFS
  // ========================================

  const videoRef = useRef(null);

  // Local camera + microphone stream
  const streamRef = useRef(null);

  // Store WebRTC connections
  const peersRef = useRef({});

  // Store ICE candidates received early
  const pendingCandidatesRef = useRef({});

  // ========================================
  // STATE
  // ========================================

  const [cameraOn, setCameraOn] = useState(false);
  const [muted, setMuted] = useState(false);
  const [connected, setConnected] = useState(false);

  // Remote participant videos
  const [remoteStreams, setRemoteStreams] = useState({});

  // ========================================
  // CREATE PEER CONNECTION
  // ========================================

  const createPeerConnection = (userId) => {
    // If connection already exists, use it
    if (peersRef.current[userId]) {
      return peersRef.current[userId];
    }

    console.log("Creating peer connection:", userId);

    const peer = new RTCPeerConnection(
      peerConfig
    );

    peersRef.current[userId] = peer;

    // ======================================
    // ADD LOCAL CAMERA + MICROPHONE
    // ======================================

    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => {
          peer.addTrack(
            track,
            streamRef.current
          );
        });
    }

    // ======================================
    // RECEIVE REMOTE VIDEO/AUDIO
    // ======================================

    peer.ontrack = (event) => {
      console.log(
        "Remote track received from:",
        userId
      );

      const remoteStream =
        event.streams[0];

      if (!remoteStream) {
        return;
      }

      setRemoteStreams((previous) => ({
        ...previous,
        [userId]: remoteStream,
      }));
    };

    // ======================================
    // SEND ICE CANDIDATE
    // ======================================

    peer.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }

      console.log(
        "Sending ICE candidate to:",
        userId
      );

      socket.emit("ice-candidate", {
        roomId: ROOM_ID,
        candidate: event.candidate,
        target: userId,
      });
    };

    // ======================================
    // CONNECTION STATE
    // ======================================

    peer.onconnectionstatechange = () => {
      console.log(
        "Peer connection state:",
        userId,
        peer.connectionState
      );

      if (
        peer.connectionState ===
          "failed" ||
        peer.connectionState ===
          "closed" ||
        peer.connectionState ===
          "disconnected"
      ) {
        removePeer(userId);
      }
    };

    // ======================================
    // ICE CONNECTION STATE
    // ======================================

    peer.oniceconnectionstatechange =
      () => {
        console.log(
          "ICE state:",
          userId,
          peer.iceConnectionState
        );
      };

    return peer;
  };

  // ========================================
  // REMOVE PEER
  // ========================================

  const removePeer = (userId) => {
    console.log("Removing peer:", userId);

    const peer =
      peersRef.current[userId];

    if (peer) {
      peer.close();

      delete peersRef.current[userId];
    }

    delete pendingCandidatesRef.current[
      userId
    ];

    setRemoteStreams((previous) => {
      const updated = {
        ...previous,
      };

      delete updated[userId];

      return updated;
    });
  };

  // ========================================
  // CREATE OFFER
  // ========================================

  const createOffer = async (userId) => {
    try {
      console.log(
        "Creating offer for:",
        userId
      );

      const peer =
        createPeerConnection(userId);

      const offer =
        await peer.createOffer();

      await peer.setLocalDescription(
        offer
      );

      console.log(
        "Sending offer to:",
        userId
      );

      socket.emit("offer", {
        roomId: ROOM_ID,
        offer,
        target: userId,
      });
    } catch (error) {
      console.error(
        "Create offer error:",
        error
      );
    }
  };

  // ========================================
  // SOCKET.IO EVENTS
  // ========================================

  useEffect(() => {
    // --------------------------------------
    // CONNECT
    // --------------------------------------

    const handleConnect = () => {
      console.log(
        "Connected to server:",
        socket.id
      );

      setConnected(true);

      socket.emit(
        "join-room",
        ROOM_ID
      );

      console.log(
        "Joined room:",
        ROOM_ID
      );
    };

    // --------------------------------------
    // DISCONNECT
    // --------------------------------------

    const handleDisconnect = () => {
      console.log(
        "Disconnected from server"
      );

      setConnected(false);
    };

    // --------------------------------------
    // NEW USER JOINED
    // --------------------------------------

    const handleUserJoined = async (
      userId
    ) => {
      console.log(
        "User joined:",
        userId
      );

      createPeerConnection(userId);

      /*
       * If this user already has a camera,
       * send an offer to the new participant.
       */

      if (streamRef.current) {
        await createOffer(userId);
      }
    };

    // --------------------------------------
    // USER READY
    // --------------------------------------

    const handleUserReady = async (
      userId
    ) => {
      console.log(
        "User ready:",
        userId
      );

      /*
       * Use socket IDs to decide who
       * creates the offer.
       *
       * This prevents both sides from
       * creating offers at the same time.
       */

      if (
        socket.id &&
        socket.id < userId
      ) {
        console.log(
          "Creating offer because this socket ID is smaller."
        );

        createPeerConnection(userId);

        if (streamRef.current) {
          await createOffer(userId);
        }
      } else {
        console.log(
          "Waiting for offer from other participant."
        );

        createPeerConnection(userId);
      }
    };

    // --------------------------------------
    // RECEIVE OFFER
    // --------------------------------------

    const handleOffer = async (data) => {
      const {
        offer,
        from,
      } = data;

      console.log(
        "Offer received from:",
        from
      );

      try {
        const peer =
          createPeerConnection(from);

        await peer.setRemoteDescription(
          new RTCSessionDescription(
            offer
          )
        );

        // Add ICE candidates that arrived
        // before the remote description
        const pending =
          pendingCandidatesRef.current[
            from
          ] || [];

        for (
          const candidate of pending
        ) {
          try {
            await peer.addIceCandidate(
              candidate
            );
          } catch (error) {
            console.error(
              "Pending ICE error:",
              error
            );
          }
        }

        delete pendingCandidatesRef
          .current[from];

        // Create answer
        const answer =
          await peer.createAnswer();

        await peer.setLocalDescription(
          answer
        );

        console.log(
          "Sending answer to:",
          from
        );

        socket.emit("answer", {
          roomId: ROOM_ID,
          answer,
          target: from,
        });
      } catch (error) {
        console.error(
          "Offer handling error:",
          error
        );
      }
    };

    // --------------------------------------
    // RECEIVE ANSWER
    // --------------------------------------

    const handleAnswer = async (
      data
    ) => {
      const {
        answer,
        from,
      } = data;

      console.log(
        "Answer received from:",
        from
      );

      const peer =
        peersRef.current[from];

      if (!peer) {
        console.error(
          "Peer connection not found:",
          from
        );

        return;
      }

      try {
        await peer.setRemoteDescription(
          new RTCSessionDescription(
            answer
          )
        );

        console.log(
          "Remote answer set successfully."
        );

        // Add pending ICE candidates
        const pending =
          pendingCandidatesRef.current[
            from
          ] || [];

        for (
          const candidate of pending
        ) {
          try {
            await peer.addIceCandidate(
              candidate
            );
          } catch (error) {
            console.error(
              "ICE error:",
              error
            );
          }
        }

        delete pendingCandidatesRef
          .current[from];
      } catch (error) {
        console.error(
          "Answer handling error:",
          error
        );
      }
    };

    // --------------------------------------
    // RECEIVE ICE CANDIDATE
    // --------------------------------------

    const handleIceCandidate = async (
      data
    ) => {
      const {
        candidate,
        from,
      } = data;

      console.log(
        "ICE candidate received from:",
        from
      );

      if (!candidate || !from) {
        return;
      }

      const peer =
        peersRef.current[from];

      // Peer doesn't exist yet
      if (!peer) {
        if (
          !pendingCandidatesRef.current[
            from
          ]
        ) {
          pendingCandidatesRef.current[
            from
          ] = [];
        }

        pendingCandidatesRef.current[
          from
        ].push(candidate);

        return;
      }

      // Remote description isn't ready yet
      if (!peer.remoteDescription) {
        if (
          !pendingCandidatesRef.current[
            from
          ]
        ) {
          pendingCandidatesRef.current[
            from
          ] = [];
        }

        pendingCandidatesRef.current[
          from
        ].push(candidate);

        return;
      }

      try {
        await peer.addIceCandidate(
          candidate
        );

        console.log(
          "ICE candidate added successfully."
        );
      } catch (error) {
        console.error(
          "Add ICE candidate error:",
          error
        );
      }
    };

    // --------------------------------------
    // USER LEFT
    // --------------------------------------

    const handleUserLeft = (
      userId
    ) => {
      console.log(
        "User left:",
        userId
      );

      removePeer(userId);
    };

    // ======================================
    // REGISTER SOCKET EVENTS
    // ======================================

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );

    socket.on(
      "user-joined",
      handleUserJoined
    );

    socket.on(
      "user-ready",
      handleUserReady
    );

    socket.on(
      "offer",
      handleOffer
    );

    socket.on(
      "answer",
      handleAnswer
    );

    socket.on(
      "ice-candidate",
      handleIceCandidate
    );

    socket.on(
      "user-left",
      handleUserLeft
    );

    // ======================================
    // CLEANUP
    // ======================================

    return () => {
      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );

      socket.off(
        "user-joined",
        handleUserJoined
      );

      socket.off(
        "user-ready",
        handleUserReady
      );

      socket.off(
        "offer",
        handleOffer
      );

      socket.off(
        "answer",
        handleAnswer
      );

      socket.off(
        "ice-candidate",
        handleIceCandidate
      );

      socket.off(
        "user-left",
        handleUserLeft
      );
    };
  }, []);

  // ========================================
  // CAMERA ON / OFF
  // ========================================

  const toggleCamera = async () => {
    // --------------------------------------
    // CAMERA IS CURRENTLY ON
    // --------------------------------------

    if (cameraOn) {
      stopCamera();

      return;
    }

    // --------------------------------------
    // TURN CAMERA ON
    // --------------------------------------

    try {
      console.log(
        "Requesting camera and microphone..."
      );

      const mediaStream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: true,
            audio: true,
          }
        );

      // Save stream
      streamRef.current =
        mediaStream;

      // Show local video
      if (videoRef.current) {
        videoRef.current.srcObject =
          mediaStream;
      }

      setCameraOn(true);

      console.log(
        "Camera and microphone started."
      );

      // Tell other participants
      socket.emit(
        "user-ready",
        ROOM_ID
      );

      // ====================================
      // ADD TRACKS TO EXISTING CONNECTIONS
      // ====================================

      Object.entries(
        peersRef.current
      ).forEach(
        ([userId, peer]) => {
          mediaStream
            .getTracks()
            .forEach((track) => {
              const sender =
                peer
                  .getSenders()
                  .find(
                    (item) =>
                      item.track &&
                      item.track.kind ===
                        track.kind
                  );

              if (sender) {
                sender.replaceTrack(
                  track
                );
              } else {
                peer.addTrack(
                  track,
                  mediaStream
                );
              }
            });

          console.log(
            "Tracks added to peer:",
            userId
          );
        }
      );
    } catch (error) {
      console.error(
        "Camera/Microphone error:",
        error
      );

      alert(
        "Please allow camera and microphone access."
      );
    }
  };

  // ========================================
  // STOP CAMERA
  // ========================================

  const stopCamera = () => {
    console.log(
      "Stopping camera..."
    );

    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });
    }

    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject =
        null;
    }

    setCameraOn(false);

    console.log(
      "Camera and microphone stopped."
    );
  };

  // ========================================
  // MUTE / UNMUTE
  // ========================================

  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current
        .getAudioTracks()
        .forEach((track) => {
          track.enabled =
            !track.enabled;
        });
    }

    setMuted(
      (previous) => !previous
    );
  };

  // ========================================
  // END CALL
  // ========================================

  const endCall = () => {
    console.log(
      "Ending call..."
    );

    // Stop camera
    stopCamera();

    // Tell server
    socket.emit(
      "leave-room",
      ROOM_ID
    );

    // Close all peer connections
    Object.keys(
      peersRef.current
    ).forEach((userId) => {
      const peer =
        peersRef.current[userId];

      if (peer) {
        peer.close();
      }
    });

    peersRef.current = {};

    // Remove remote videos
    setRemoteStreams({});

    // Disconnect Socket.IO
    socket.disconnect();

    setConnected(false);
    setMuted(false);

    console.log(
      "Call ended."
    );
  };

  // ========================================
  // UI
  // ========================================

  return (
    <div className="app">
      {/* ==================================
          TITLE
      ================================== */}

      <h1>Video Conference</h1>

      {/* ==================================
          CONNECTION STATUS
      ================================== */}

      <div className="connection-status">
        {connected
          ? "🟢 Connected to server"
          : "🔴 Disconnected"}
      </div>

      {/* ==================================
          LOCAL VIDEO
      ================================== */}

      <div className="video-container">
        <div className="video-box">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={
              cameraOn
                ? "video-active"
                : "video-hidden"
            }
          />

          {!cameraOn && (
            <p>Camera Preview</p>
          )}
        </div>
      </div>

      {/* ==================================
          REMOTE VIDEOS
      ================================== */}

      {Object.entries(
        remoteStreams
      ).map(
        ([
          userId,
          remoteStream,
        ]) => (
          <RemoteVideo
            key={userId}
            stream={remoteStream}
            userId={userId}
          />
        )
      )}

      {/* ==================================
          CONTROLS
      ================================== */}

      <div className="controls">
        {/* MUTE */}

        <button
          onClick={toggleMute}
        >
          {muted
            ? "🔊 Unmute"
            : "🎤 Mute"}
        </button>

        {/* CAMERA */}

        <button
          onClick={toggleCamera}
        >
          {cameraOn
            ? "📷 Camera Off"
            : "📷 Camera"}
        </button>

        {/* END CALL */}

        <button
          onClick={endCall}
        >
          📞 End Call
        </button>
      </div>
    </div>
  );
}

// ==========================================
// REMOTE VIDEO COMPONENT
// ==========================================

function RemoteVideo({
  stream,
  userId,
}) {
  const remoteVideoRef =
    useRef(null);

  useEffect(() => {
    if (
      remoteVideoRef.current
    ) {
      remoteVideoRef.current.srcObject =
        stream;

      remoteVideoRef.current
        .play()
        .catch((error) => {
          console.log(
            "Remote video autoplay:",
            error
          );
        });
    }
  }, [stream]);

  return (
    <div className="remote-video-wrapper">
      <div className="video-box">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="video-active"
        />

        <p>
          Participant: {userId}
        </p>
      </div>
    </div>
  );
}

export default App;