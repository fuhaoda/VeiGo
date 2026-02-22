const DEFAULT_ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: DEFAULT_ICE_SERVERS });
}

export async function waitIceGatheringComplete(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") {
    return;
  }

  await new Promise<void>((resolve) => {
    const onStateChange = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", onStateChange);
        resolve();
      }
    };

    pc.addEventListener("icegatheringstatechange", onStateChange);

    setTimeout(() => {
      pc.removeEventListener("icegatheringstatechange", onStateChange);
      resolve();
    }, 3000);
  });
}

export function randomRoomId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
