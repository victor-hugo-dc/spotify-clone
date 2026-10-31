import React, {
	useState,
	useEffect,
	useContext,
	useImperativeHandle,
	useRef,
	type Ref,
} from "react";
import { useMatch, useNavigate } from "react-router";

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
	repeat_state: Repeat;
	shuffle_state: boolean;
	is_playing: boolean;
	progress_ms: number | null;
	context: { uri: string } | null;
	item: (Track & { album: Album }) | null;
	device: { id: string | null; volume_percent: number | null };
};

type Repeat = "off" | "context" | "track";
type PlaybackState = { play: boolean; shuffle: boolean; repeat: Repeat; progress: number; at: number; total_time: number };

// Spotify's repeat button cycles off -> whole playlist/album -> this track -> off.
const nextRepeat: Record<Repeat, Repeat> = { off: "context", context: "track", track: "off" };
// The SDK numbers them: 0 off, 1 repeat this track, 2 repeat the context.
const sdkRepeat: Repeat[] = ["off", "track", "context"];

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
		repeat: "off",
		progress: 0,
		at: 0,
		total_time: 0,
	});
	const [now, setNow] = useState(Date.now);

	const [scrubPb, setScrubPb] = useState<number | null>(null);
	const [volume, setVolume] = useState(1);
	const [connectTip, setConnectTip] = useState(false);
	const [commentTip, setCommentTip] = useState(false);


	const [playInfo, setPlayInfo] = useState<PlayInfo>({
		album: { uri: "", images: [] },
		artists: [],
		name: "",
		id: "",
		uri: "",
	});
	const [contextUri, setContextUri] = useState<string | null>(null);
	const [deviceId, setDeviceId] = useState<string | null>(null);
	const [activeDevice, setActiveDevice] = useState<string | null>(null);

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
	// The volume to go back to when unmuting.
	const unmuted = useRef(0.5);

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

	// The SDK only reports playback on this browser's own device. While another device (or none) is active, ask Spotify
	// every few seconds, and only while the tab is visible: the request quota is shared by the whole developer account.
	useEffect(() => {
		if (deviceId !== null && activeDevice === deviceId) return;
		const poll = () => document.visibilityState === "visible" && apiUpdate();
		const timer = setInterval(poll, 5000);
		document.addEventListener("visibilitychange", poll);
		return () => {
			clearInterval(timer);
			document.removeEventListener("visibilitychange", poll);
		};
		// eslint-disable-next-line
	}, [activeDevice, deviceId]);

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
		script.onerror = () => setMessage("Couldn't load Spotify's web player (is a blocker stopping sdk.scdn.co?). Use Devices to play elsewhere.");

		document.body.appendChild(script);
	};

	const playerInit = () => {
		const sdkPlayer = new window.Spotify.Player({
			name: "Spotify Clone Player",
			// The SDK asks again whenever its token runs out, so hand it a fresh one each time.
			getOAuthToken: (cb) => {
				accessToken()
					.then((token) => (token ? cb(token) : setMessage("You've been logged out. Reload to log in again.")))
					.catch((error) => setMessage(`ERROR: ${error.message}`));
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
				repeat: sdkRepeat[repeat_mode] ?? "off",
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

		// Connect to the player! It resolves false when Spotify refuses the browser (e.g. DRM is off, or a blocker).
		sdkPlayer.connect().then((connected) => connected || setMessage("Couldn't start the in-browser player. Use Devices to play elsewhere."));
	};

	// Play buttons elsewhere in the app call this after a command.
	useImperativeHandle(ref, () => ({ updateState: () => refreshSoon() }));

	// Asks the Web API rather than the SDK, which only reports playback on this browser's own device.
	const apiUpdate = () => {
		clearTimeout(timerRef.current);

		spotify<PlaybackResponse | undefined>("/me/player")
			.then((state) => {
				// 204: no device is active (the in-browser player takes over once it's ready), so nothing is playing.
				if (!state) {
					setActiveDevice(null);
					setPlaybackState((state) => ({ ...state, play: false }));
					return;
				}
				const { repeat_state, shuffle_state, is_playing, progress_ms, item, device, context } = state;
				setActiveDevice(device.id);
				if (!item) {
					setPlaybackState((state) => ({ ...state, play: is_playing }));
					return;
				}
				const progress = progress_ms ?? 0;

				// Check again when the track ends.
				timerRef.current = setTimeout(() => apiUpdate(), item.duration_ms - progress + 10);

				setVolume((device.volume_percent ?? 100) / 100);
				setPlaybackState((state) => ({
					...state,
					play: is_playing,
					shuffle: shuffle_state,
					repeat: repeat_state,
					progress,
					at: Date.now(),
					total_time: item.duration_ms,
				}));
				setPlayInfo(item);
				setContextUri(context?.uri ?? null);
			})
			.catch((error) => console.log(error));
	};

	// Spotify applies a command a moment after accepting it; reading its state at once would undo what we just showed.
	const refreshSoon = () => {
		clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => apiUpdate(), 500);
	};

	// Player commands fail with Spotify's reason, e.g. no active device or no Premium. `show` sets the state the command
	// asked for (never a toggle of whatever is there now, so quick double clicks can't invert it); the re-read confirms it.
	const command = (path: string, method: "PUT" | "POST", show: (state: PlaybackState) => PlaybackState = (state) => state) => {
		playerCommand(path, deviceId, { method })
			.then(() => {
				setPlaybackState(show);
				refreshSoon();
			})
			.catch((error) => setMessage(`ERROR: ${error.message}`));
	};

	const togglePlay = () => {
		const play = !playbackState.play;
		command(`/me/player/${play ? "play" : "pause"}`, "PUT", (state) => ({ ...state, play, progress: positionAt(state, Date.now()), at: Date.now() }));
	};

	const toggleShuffle = () => {
		const shuffle = !playbackState.shuffle;
		command(`/me/player/shuffle?state=${shuffle}`, "PUT", (state) => ({ ...state, shuffle }));
	};

	const toggleRepeat = () => {
		const repeat = nextRepeat[playbackState.repeat];
		command(`/me/player/repeat?state=${repeat}`, "PUT", (state) => ({ ...state, repeat }));
	};

	const skipNext = () => command("/me/player/next", "POST");

	const skipPrev = () => command("/me/player/previous", "POST");

	const seekPlayback = (ratio: number) => {
		const time = Math.round(ratio * playbackState.total_time);
		command(`/me/player/seek?position_ms=${time}`, "PUT", (state) => ({ ...state, progress: time, at: Date.now() }));

		setScrubPb(null);
	};

	const position = positionAt(playbackState, now);

	const scrubPlayback = (ratio: number | null) => setScrubPb(ratio === null ? null : ratio * playbackState.total_time);

	const seekVolume = (ratio: number) => {
		playerCommand(`/me/player/volume?volume_percent=${Math.round(ratio * 100)}`, deviceId, { method: "PUT" })
			.then(() => setVolume(ratio))
			.catch((error) => setMessage(`ERROR: ${error.message}`));
	};

	// The volume icon mutes and unmutes, as on Spotify.
	const toggleMute = () => {
		if (volume > 0) unmuted.current = volume;
		seekVolume(volume > 0 ? 0 : unmuted.current);
	};

	// The Annotations button opens the annotations page, or leaves it when you're already there.
	const navigate = useNavigate();
	const onAnnotations = useMatch("/annotations") !== null;
	const toggleAnnotations = () => {
		if (!onAnnotations) navigate("/annotations");
		else if (window.history.state?.idx > 0) navigate(-1);
		else navigate("/");
	};
	const loaded = playInfo.name !== "";

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
							title={{ off: "Enable repeat", context: "Enable repeat one", track: "Disable repeat" }[playbackState.repeat]}
							icon="Repeat"
							active={playbackState.repeat !== "off"}
							extraClass={playbackState.repeat === "track" ? "repeat-one" : undefined}
							onClick={toggleRepeat}
						/>
					</div>

					<div className="player-playback" draggable="false">
						<div className="playback-time" draggable="false">
							{formatTime(scrubPb ?? position)}
						</div>
						<ProgressBar
							label="Seek"
							extraClass="playback"
							value={playbackState.total_time ? position / playbackState.total_time : 0}
							setValue={seekPlayback}
							scrubFunction={scrubPlayback}
							valueText={(ratio) => `${formatTime(ratio * playbackState.total_time)} of ${formatTime(playbackState.total_time)}`}
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
										song={{ id: playInfo.id ?? "", name: playInfo.name, artist: (playInfo.artists ?? []).map((artist) => artist.name).join(", "), image: playInfo.album?.images.at(-1)?.url ?? null, position }}
									/>
								)}
								<ControlButton
									title={!loaded ? "Play a song to comment on it" : playInfo.id ? "Comment" : "Local files can't be commented on"}
									icon="Comment"
									size="x-larger"
									disabled={!loaded || !playInfo.id}
									onClick={() => setCommentTip(!commentTip)}
								/>
							</span>
							<span className="annotation-wrapper">
								<ControlButton
									title={loaded ? "Annotations" : "Play a song to annotate it"}
									icon="Annotation"
									size="x-larger"
									active={onAnnotations}
									disabled={!loaded}
									onClick={toggleAnnotations}
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
								title={volume > 0 ? "Mute" : "Unmute"}
								icon="Volume"
								size="x-larger"
								extraClass="volume"
								active={volume === 0}
								onClick={toggleMute}
							/>
							<div style={{ width: "100%" }}>
								<ProgressBar
									label="Volume"
									extraClass="volume"
									value={volume}
									setValue={seekVolume}
									valueText={(ratio) => `${Math.round(ratio * 100)}%`}
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
