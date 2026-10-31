import React, {
	useState,
	useEffect,
	useContext,
	useImperativeHandle,
	useRef,
	type Ref,
} from "react";
import { useNavigate } from "react-router";

import ProgressBar from "./ProgressBar";
import NowPlaying, { type PlayInfo } from "./NowPlaying";
import ConnectDevices from "./ConnectDevices";
import ControlButton from "./ControlButton";

import AddComment from "./AddComment";

import { playerCommand, spotify } from "../../utilities/spotify";
import { accessToken } from "../../utilities/session";
import formatTime from "../../utilities/time";
import { MessageContext, type NowPlaying as NowPlayingState } from "../../utilities/context";
import type { Album, Track } from "../../utilities/types";

export type PlayerHandle = { updateState: () => void };

type PlaybackResponse = {
	repeat_state: string;
	shuffle_state: boolean;
	is_playing: boolean;
	progress_ms: number | null;
	context: { uri: string } | null;
	item: (Track & { album: Album }) | null;
	device: { volume_percent: number | null };
};

type PlaybackState = { play: boolean; shuffle: boolean; repeat: boolean; progress: number; at: number; total_time: number };

// Where playback is at `now`: the position measured at `at`, plus the time since while playing, never past the end.
// Counting time rather than timer ticks keeps it right in background tabs, whose timers browsers slow down.
const positionAt = ({ play, progress, at, total_time }: PlaybackState, now: number) =>
	Math.min(progress + (play ? Math.max(0, now - at) : 0), total_time);

type Props = { onNowPlaying: (nowPlaying: NowPlayingState) => void; ref?: Ref<PlayerHandle> };

const Player = ({ onNowPlaying, ref }: Props) => {
	const setMessage = useContext(MessageContext);
	const [playbackState, setPlaybackState] = useState<PlaybackState>({
		play: false,
		shuffle: false,
		repeat: false,
		progress: 0,
		at: 0,
		total_time: 0,
	});
	const [now, setNow] = useState(Date.now);

	const [scrubPb, setScrubPb] = useState<number | null>(null);
	const [volume, setVolume] = useState(1);
	const [connectTip, setConnectTip] = useState(false);
	const [commentTip, setCommentTip] = useState(false);

	//added close function to annotations
  	const [closeAnnotations, setCloseAnnotations] = useState(false);

	const [playInfo, setPlayInfo] = useState<PlayInfo>({
		album: { uri: "", images: [] },
		artists: [],
		name: "",
		id: "",
		uri: "",
	});
	const [contextUri, setContextUri] = useState<string | null>(null);
	const [deviceId, setDeviceId] = useState<string | null>(null);

	useEffect(() => {
		onNowPlaying({ trackUri: playInfo.uri || null, contextUri, playing: playbackState.play, deviceId });
	}, [playInfo.uri, contextUri, playbackState.play, deviceId, onNowPlaying]);

	// Like Spotify's tab title: what's playing, while it plays.
	useEffect(() => {
		const artists = (playInfo.artists ?? []).map((artist) => artist.name).join(", ");
		document.title = playbackState.play && playInfo.name ? `${playInfo.name}${artists ? ` • ${artists}` : ""}` : "Shoutify";
	}, [playInfo, playbackState.play]);

	const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const player = useRef<Spotify.Player | null>(null);

	useEffect(() => {
		loadScript();
		apiUpdate();

		window.onSpotifyWebPlaybackSDKReady = () => playerInit();

		return () => {
			clearTimeout(timerRef.current);
			player.current?.disconnect();
		};
		// eslint-disable-next-line
	}, []);

	// Re-render twice a second while playing, so the clock and the bar move.
	useEffect(() => {
		if (!playbackState.play) return;
		const tick = setInterval(() => setNow(Date.now()), 500);
		return () => clearInterval(tick);
	}, [playbackState.play]);

	const loadScript = () => {
		if (document.getElementById("spotify-player")) return;
		const script = document.createElement("script");

		script.id = "spotify-player";
		script.async = true;
		script.src = "https://sdk.scdn.co/spotify-player.js";

		document.body.appendChild(script);
	};

	const playerInit = () => {
		const sdkPlayer = new window.Spotify.Player({
			name: "Spotify Clone Player",
			// The SDK asks again whenever its token runs out, so hand it a fresh one each time.
			getOAuthToken: (cb) => {
				accessToken()
					.then((token) => token && cb(token))
					.catch((error) => console.log(error));
			},
		});
		player.current = sdkPlayer;

		// Error handling
		const showError = ({ message }: Spotify.Error) => setMessage(message);
		sdkPlayer.addListener("initialization_error", showError);
		sdkPlayer.addListener("authentication_error", showError);
		sdkPlayer.addListener("account_error", showError);
		sdkPlayer.addListener("playback_error", showError);
		sdkPlayer.addListener("autoplay_failed", () => setMessage("Your browser blocked autoplay. Press play to start listening."));

		// Browsers only let audio start after the page has been clicked; this unlocks the player on the first click.
		document.addEventListener("click", () => sdkPlayer.activateElement(), { once: true });

		// Playback status updates; the state is null once playback moves to another device.
		sdkPlayer.addListener("player_state_changed", (state: Spotify.PlaybackState | null) => {
			if (!state) return;
			const { duration, position, paused, shuffle, repeat_mode, track_window, context } = state;
			const { current_track } = track_window;

			// A relinked track plays under another URI; lists show the one it was linked from.
			setPlayInfo({ ...current_track, uri: current_track.linked_from?.uri ?? current_track.uri });
			setContextUri(context?.uri ?? null);
			setPlaybackState((state) => ({
				...state,
				play: !paused,
				shuffle: shuffle,
				repeat: repeat_mode !== 0,
				progress: position,
				at: Date.now(),
				total_time: duration,
			}));
		});

		// Ready
		// Ready: unless something else is already playing, make this browser the active device so play buttons just work.
		sdkPlayer.addListener("ready", ({ device_id }) => {
			setDeviceId(device_id);
			spotify<PlaybackResponse | undefined>("/me/player")
				.then((state) => state ?? spotify("/me/player", { method: "PUT", body: { device_ids: [device_id], play: false } }))
				.then(() => apiUpdate())
				.catch((error) => setMessage(`ERROR: ${error.message}`));
		});

		// Not Ready
		sdkPlayer.addListener("not_ready", ({ device_id }) => {
			console.log("Device ID has gone offline", device_id);
			setDeviceId(null);
		});

		// Connect to the player!
		sdkPlayer.connect();
	};

	//Reference for parent component to use updateState
	// Spotify takes a moment to apply a command, so look again shortly after one.
	useImperativeHandle(ref, () => ({
		updateState: () => {
			clearTimeout(timerRef.current);
			timerRef.current = setTimeout(() => apiUpdate(), 500);
		},
	}));

	// Asks the Web API rather than the SDK, which only reports playback on this browser's own device.
	const apiUpdate = () => {
		clearTimeout(timerRef.current);

		spotify<PlaybackResponse | undefined>("/me/player")
			.then((state) => {
				// 204: no device is active; the in-browser player takes over once it's ready.
				if (!state) return;
				const { repeat_state, shuffle_state, is_playing, progress_ms, item, device, context } = state;
				if (!item) return;
				const progress = progress_ms ?? 0;

				// Check again when the track ends.
				timerRef.current = setTimeout(() => apiUpdate(), item.duration_ms - progress + 10);

				setVolume((device.volume_percent ?? 100) / 100);
				setPlaybackState((state) => ({
					...state,
					play: is_playing,
					shuffle: shuffle_state,
					repeat: repeat_state !== "off",
					progress,
					at: Date.now(),
					total_time: item.duration_ms,
				}));
				setPlayInfo(item);
				setContextUri(context?.uri ?? null);
			})
			.catch((error) => console.log(error));
	};

	// Player commands fail with Spotify's reason, e.g. no active device or no Premium.
	const command = (path: string, method: "PUT" | "POST", onDone: () => void) => {
		playerCommand(path, deviceId, { method })
			.then(onDone)
			.catch((error) => setMessage(`ERROR: ${error.message}`));
	};

	const togglePlay = () => {
		command(`/me/player/${playbackState.play ? "pause" : "play"}`, "PUT", () => {
			setPlaybackState((state) => ({ ...state, play: !state.play, progress: positionAt(state, Date.now()), at: Date.now() }));
			apiUpdate();
		});
	};

	const toggleShuffle = () => {
		command(`/me/player/shuffle?state=${!playbackState.shuffle}`, "PUT", () => {
			setMessage(`Shuffle ${playbackState.shuffle ? "Off" : "On"}`);
			setPlaybackState((state) => ({ ...state, shuffle: !state.shuffle }));
			apiUpdate();
		});
	};

	const toggleRepeat = () => {
		command(`/me/player/repeat?state=${playbackState.repeat ? "off" : "track"}`, "PUT", () => {
			setMessage(`Repeat Track ${playbackState.repeat ? "Off" : "On"}`);
			setPlaybackState((state) => ({ ...state, repeat: !state.repeat }));
			apiUpdate();
		});
	};

	const skipNext = () => command("/me/player/next", "POST", apiUpdate);

	const skipPrev = () => command("/me/player/previous", "POST", apiUpdate);

	const seekPlayback = (ratio: number) => {
		const time = Math.round(ratio * playbackState.total_time);
		command(`/me/player/seek?position_ms=${time}`, "PUT", () => {
			setPlaybackState((state) => ({ ...state, progress: time, at: Date.now() }));
			apiUpdate();
		});

		setScrubPb(null);
	};

	const position = positionAt(playbackState, now);

	const scrubPlayback = (ratio: number) => {
		const time = ratio * playbackState.total_time;
		setScrubPb(time);
	};

	const seekVolume = (ratio: number) => {
		const integer = Math.round(ratio * 100);
		command(`/me/player/volume?volume_percent=${integer}`, "PUT", () => setVolume(ratio));
	};

	// Redirects to the annotations page
	const navigate = useNavigate()
	// annotations closes when you press it again
	const routeChangeAnnotations = () => {
	    const path = "/annotations";
	    if (!closeAnnotations) {
	      setCloseAnnotations(!closeAnnotations);
	      navigate(path);
	    } else {
	      const path = "/";
	      setCloseAnnotations(!closeAnnotations);
	      navigate(path);
	    }
	  };

	return (
		<>
			<div className="player">
				<div className="player-left">
					<NowPlaying playInfo={playInfo} />
				</div>

				<div className="player-center">
					<div className="player-control-buttons">
						<ControlButton
							title="Toggle Shuffle"
							icon="Shuffle"
							active={playbackState.shuffle}
							onClick={toggleShuffle}
						/>
						<ControlButton
							title="Previous"
							icon="TrackBack"
							size="x-smaller"
							onClick={skipPrev}
						/>
						<ControlButton
							title={playbackState.play ? "Pause" : "Play"}
							icon={playbackState.play ? "Pause" : "Play"}
							size={playbackState.play ? "smaller" : "larger"}
							extraClass="circle-border"
							onClick={togglePlay}
						/>
						<ControlButton
							title="Next"
							icon="TrackNext"
							size="x-smaller"
							onClick={skipNext}
						/>
						<ControlButton
							title="Toggle Repeat"
							icon="Repeat"
							active={playbackState.repeat}
							onClick={toggleRepeat}
						/>
					</div>

					<div className="player-playback" draggable="false">
						<div className="playback-time" draggable="false">
							{formatTime(scrubPb ?? position)}
						</div>
						<ProgressBar
							extraClass="playback"
							value={playbackState.total_time ? position / playbackState.total_time : 0}
							engageClass="engage"
							setValue={(ratio) => seekPlayback(ratio)}
							scrubFunction={scrubPlayback}
						/>
						<div className="playback-time" draggable="false">
							{formatTime(playbackState.total_time)}
						</div>
					</div>
				</div>

				<div className="player-right">
					<div className="extra-controls">
						 <div className="social-features">
							<span className="comment-wrapper">
								{commentTip && (
									<AddComment
										closeTip={() => setCommentTip(false)}
									/>
								)}
								<ControlButton
									title="Comment"
									icon="Comment"
									size="x-larger"
									onClick={() => {
										if (playInfo.name !== "") {
											setCommentTip(!commentTip)
										}
									}}
								/>
							</span>
							<span className="annotation-wrapper">
								<ControlButton
										title="Annotations"
										icon="Annotation"
										size="x-larger"
										onClick={() => {
											if (playInfo.name !== "") {
												routeChangeAnnotations()
											}
										}}
									/>
							</span>

						</div>

						<span className="connect-devices-wrapper">
							{connectTip && (
								<ConnectDevices
									closeTip={() => setConnectTip(false)}
								/>
							)}
							<ControlButton
								title="Devices"
								icon="Speaker"
								size="x-larger"
								onClick={() => setConnectTip(!connectTip)}
								active={playbackState.play}
							/>
						</span>

						<div className="volume-control">
							<ControlButton
								title="Volume"
								icon="Volume"
								size="x-larger"
								extraClass="volume"
							/>
							<div style={{ width: "100%" }}>
								<ProgressBar
									extraClass="volume"
									value={volume}
									engageClass="engage"
									setValue={(ratio) => seekVolume(ratio)}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};

export default Player;
