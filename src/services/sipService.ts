import { useAuthStore } from "@/stores/auth";
import {
  UserAgent,
  Registerer,
  Inviter,
  SessionState,
  RegistererState,
  Invitation,
  Session,
} from "sip.js";
import { toast } from "vue-sonner";
import { markRaw } from 'vue';

type SipServiceOptions = {
  server: string;
  wsServer: string;
  displayName?: string;
};

type SipServiceEvents = {
  onRegistered?: () => void;
  onUnregistered?: () => void;
  onRegistrationFailed?: (error: Error) => void;
  onIncomingCall?: (session: Session, caller: string) => void;
  onCallEstablished?: (session: Session) => void;
  onCallEnded?: () => void;
  onDebug?: (msg: string) => void;
};

export class SipService {
  private ua: UserAgent | null = null;
  private registerer: Registerer | null = null;
  private session: Session | null = null;
  private events: SipServiceEvents = {};


  constructor(private options: SipServiceOptions) { }

  public setEvents(events: SipServiceEvents) {
    this.events = events;
  }

  public async login(extension: string, password: string) {
    if (this.ua) return;

    this.ua = new UserAgent({
      uri: UserAgent.makeURI(`sip:${extension}@${this.options.server}`),
      displayName: this.options.displayName || extension,
      authorizationUsername: extension,
      authorizationPassword: password,
      transportOptions: { server: this.options.wsServer },
    });

    this.ua.delegate = {
      onConnect: () => {
        this.events.onDebug?.("[DEBUG] WebSocket connected.")
        toast(markRaw({
          title: 'WebSocket Connected',
          description: 'Successfully connected to WebSocket server',
          duration: 3000,
          variant: 'success',
        }));
      },
      onDisconnect: (error) => {
        this.events.onDebug?.(
          `[DEBUG] WebSocket disconnected. ${error?.message || ""}`
        );

        const authStore = useAuthStore();
        authStore.logout();
        this.events.onUnregistered?.();
      },
      onInvite: async (incomingSession: Invitation) => {
        const callerId = incomingSession.remoteIdentity.uri.user || "";
        this.events.onIncomingCall?.(incomingSession, callerId);

        // Save the session
        this.session = incomingSession;

        incomingSession.stateChange.addListener((state) => {
          this.events.onDebug?.(`[DEBUG] Incoming Call State: ${state}`);
          if (state === SessionState.Established) {
            this.events.onCallEstablished?.(incomingSession);
          }
          if (state === SessionState.Terminated) {
            this.session = null;
            this.events.onCallEnded?.();
          }
        });
      },
    };

    await this.ua.start();

    this.registerer = new Registerer(this.ua);
    this.registerer.stateChange.addListener((newState) => {
      this.events.onDebug?.(`[DEBUG] Registerer State Change: ${newState}`);
      if (newState === RegistererState.Registered) {
        this.events.onRegistered?.();
      } else if (
        newState === RegistererState.Unregistered ||
        newState === RegistererState.Terminated
      ) {
        this.events.onUnregistered?.();
      }
    });

    try {
      await this.registerer.register();
    } catch (err: unknown) {
      this.events.onRegistrationFailed?.(err as Error);
    }
  }

  public async logout() {
    if (this.registerer) {
      await this.registerer.unregister();
      this.registerer = null;
    }
    if (this.ua) {
      await this.ua.stop();
      this.ua = null;
    }
    this.session = null;
    this.events.onUnregistered?.();
  }

  public async call(destination: string): Promise<Inviter | undefined> {
    if (!this.ua) {
      this.events.onDebug?.("[Error] UserAgent not initialized.");
      // Show toast for error
      toast(markRaw({
        title: 'Uh oh! Something went wrong.',
        description: 'UserAgent is not initialized.',
        variant: 'destructive',
      }));
      return;
    }
    const target = UserAgent.makeURI(`sip:${destination}@${this.options.server}`);
    if (!target) {
      this.events.onDebug?.("[Error] Invalid destination URI.");
      // Show toast for error
      toast(markRaw({
        title: 'Uh oh! Something went wrong.',
        description: 'There was a problem with your request.',
        variant: 'destructive',
        default: () => 'Try again',
      }));
      return;
    }

    const inviter = new Inviter(this.ua, target);
    inviter.stateChange.addListener((callState) => {
      this.events.onDebug?.(`[DEBUG] Call State: ${callState}`);

      if (callState === SessionState.Establishing) {
        this.events.onDebug?.("[INFO] Call is being established...");
      } else if (callState === SessionState.Established) {
        this.events.onDebug?.("[INFO] Call has been established");
        this.events.onCallEstablished?.(inviter);

        // Handle audio setup immediately on establishment
        const sdh = inviter.sessionDescriptionHandler as { peerConnection?: RTCPeerConnection };
        if (sdh?.peerConnection) {
          sdh.peerConnection.getReceivers().forEach((receiver: RTCRtpReceiver) => {
            if (receiver.track) {
              this.events.onDebug?.("[INFO] Setting up audio stream");
              // Audio setup will be handled in the store through onCallEstablished
            }
          });
        }
      } else if (callState === SessionState.Terminated) {
        this.events.onDebug?.("[INFO] Call has been terminated");
        this.session = null;
        this.events.onCallEnded?.();
      }
    });

    this.session = inviter;
    this.events.onDebug?.("[INFO] Sending invite...");
    await inviter.invite();
    return inviter;
  }

  public async acceptCall(session: Invitation) {
    await session.accept();
    this.session = session;
  }

  public rejectCall(session: Invitation) {
    // Send 480 Temporarily Unavailable response
    session.reject({
      statusCode: 480,
      reasonPhrase: "Temporarily Unavailable"
    });
    // Ensure session is terminated
    this.session = null;
    this.events.onCallEnded?.();
  }

  public hangup(session?: Session) {
    const target = session || this.session;
    if (target) {
      // Stop all audio tracks before hanging up
      const sdh = target.sessionDescriptionHandler as { peerConnection?: RTCPeerConnection };
      if (sdh?.peerConnection) {
        // Stop all senders (microphone)
        sdh.peerConnection.getSenders().forEach((sender: RTCRtpSender) => {
          if (sender.track) {
            sender.track.stop();
            sender.track.enabled = false;
          }
        });
        // Stop all receivers (speaker)
        sdh.peerConnection.getReceivers().forEach((receiver: RTCRtpReceiver) => {
          if (receiver.track) {
            receiver.track.stop();
          }
        });
      }
      // End the call based on session state and type
      switch (target.state) {
        case SessionState.Initial:
        case SessionState.Establishing:
          if (target instanceof Inviter) {
            // Outgoing call not yet established
            target.cancel();
          } else if (target instanceof Invitation) {
            // Incoming call not yet established
            target.reject();
          }
          break;
        case SessionState.Established:
          // Established call
          if ("bye" in target) {
            (target as Inviter).bye();
          }
          break;
        case SessionState.Terminating:
        case SessionState.Terminated:
          // Already terminating/terminated, do nothing
          break;
      }
      if ("bye" in target) {
        (target as Inviter).bye();
      }
    }
    this.session = null;
    this.events.onCallEnded?.();
  }

  public toggleMute(isMuted: boolean) {
    if (!this.session) return;
    const sdh = this.session.sessionDescriptionHandler as { peerConnection?: RTCPeerConnection };
    const pc = sdh?.peerConnection;
    if (!pc) return;
    pc.getSenders().forEach((sender: RTCRtpSender) => {
      if (sender.track?.kind === "audio") {
        sender.track.enabled = !isMuted;
      }
    });
  }
}
