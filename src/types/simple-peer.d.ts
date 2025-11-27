/**
 * Type declarations for simple-peer
 */

declare module 'simple-peer' {
  import { Duplex } from 'stream';

  interface Options {
    initiator?: boolean;
    channelConfig?: RTCDataChannelInit;
    channelName?: string;
    config?: RTCConfiguration;
    offerOptions?: RTCOfferOptions;
    answerOptions?: RTCAnswerOptions;
    sdpTransform?: (sdp: string) => string;
    stream?: MediaStream;
    streams?: MediaStream[];
    trickle?: boolean;
    allowHalfTrickle?: boolean;
    wrtc?: {
      RTCPeerConnection: typeof RTCPeerConnection;
      RTCSessionDescription: typeof RTCSessionDescription;
      RTCIceCandidate: typeof RTCIceCandidate;
    };
    objectMode?: boolean;
  }

  interface SignalData {
    type?: 'offer' | 'answer' | 'pranswer' | 'rollback';
    sdp?: string;
    candidate?: RTCIceCandidate;
    renegotiate?: boolean;
    transceiverRequest?: {
      kind: string;
      init?: RTCRtpTransceiverInit;
    };
  }

  interface Instance extends Duplex {
    signal(data: SignalData): void;
    send(data: string | Uint8Array | ArrayBuffer | Blob): void;
    addStream(stream: MediaStream): void;
    removeStream(stream: MediaStream): void;
    addTrack(track: MediaStreamTrack, stream: MediaStream): void;
    removeTrack(track: MediaStreamTrack, stream: MediaStream): void;
    replaceTrack(oldTrack: MediaStreamTrack, newTrack: MediaStreamTrack, stream: MediaStream): void;
    destroy(error?: Error): void;

    readonly connected: boolean;
    readonly destroying: boolean;
    readonly destroyed: boolean;
    readonly initiator: boolean;
    readonly channelName: string;
    readonly _pc: RTCPeerConnection;

    // Events
    on(event: 'signal', listener: (data: SignalData) => void): this;
    on(event: 'connect', listener: () => void): this;
    on(event: 'data', listener: (data: Uint8Array) => void): this;
    on(event: 'stream', listener: (stream: MediaStream) => void): this;
    on(event: 'track', listener: (track: MediaStreamTrack, stream: MediaStream) => void): this;
    on(event: 'close', listener: () => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'iceStateChange', listener: (state: RTCIceConnectionState) => void): this;
    on(event: 'negotiate', listener: () => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;

    once(event: 'signal', listener: (data: SignalData) => void): this;
    once(event: 'connect', listener: () => void): this;
    once(event: 'data', listener: (data: Uint8Array) => void): this;
    once(event: 'stream', listener: (stream: MediaStream) => void): this;
    once(event: 'track', listener: (track: MediaStreamTrack, stream: MediaStream) => void): this;
    once(event: 'close', listener: () => void): this;
    once(event: 'error', listener: (error: Error) => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this;

    off(event: string | symbol, listener: (...args: any[]) => void): this;
    removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
    removeAllListeners(event?: string | symbol): this;
  }

  interface SimplePeerConstructor {
    new (opts?: Options): Instance;
    (opts?: Options): Instance;
    readonly WEBRTC_SUPPORT: boolean;
  }

  const SimplePeer: SimplePeerConstructor;
  export default SimplePeer;
  export { Options, SignalData, Instance };
}
