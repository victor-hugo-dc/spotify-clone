import React, {
	useState,
	useEffect,
	useContext,
	useImperativeHandle,
	useMemo,
	useRef,
	type Ref,
} from "react";

import ProgressBar from "./ProgressBar";
import NowPlaying, { type PlayInfo } from "./NowPlaying";
import ConnectDevices from "./ConnectDevices";
import ControlButton from "./ControlButton";
import Icon from "../icons";

import { playerCommand, spotify } from "../../utilities/spotify";
import { accessToken } from "../../utilities/session";
import formatTime, { positionAt } from "../../utilities/time";
import useWriteComment from "../../utilities/hooks/useWriteComment";
import { LayoutContext, MessageContext, setPlaybackClock, type NowPlaying as NowPlayingState, type PlayingTrack } from "../../utilities/context";
import "../../styles/player.css";

export type PlayerHandle = { updateState: () => void; seek: (ms: number) => void };

type PlaybackResponse = {
	repeat_state: Repeat;
	shuffle_state: boolean;
	is_playing: boolean;
	progress_ms: number | null;
	context: { uri: string } | null;
	item: (PlayInfo & { duration_ms: number }) | null;
	device: { id: string | null; name: string; volume_percent: number | null };
};

type Repeat = "off" | "context" | "track";
type PlaybackState = { play: boolean; shuffle: boolean; repeat: Repeat; progress: number; at: number; total_time: number };

// Spotify's repeat button cycles off -> whole playlist/album -> this track -> off.
const nextRepeat: Record<Repeat, Repeat> = { off: "context", context: "track", track: "off" };
// The SDK numbers them: 0 off, 1 repeat the context, 2 repeat this track (the @types comment has 1 and 2 swapped).
const sdkRepeat: Repeat[] = ["off", "context", "track"];

// The id in a spotify:album:… or spotify:artist:… URI; null for local files and episodes, which have neither.
const idOf = (uri: string | null | undefined, kind: "album" | "artist") => (uri?.startsWith(`spotify:${kind}:`) ? (uri.split(":")[2] ?? null) : null);

type Props = { onNowPlaying: (nowPlaying: NowPlayingState) => void; ref?: Ref<PlayerHandle> };

const Player = ({ onNowPlaying, ref }: Props) => {
	const setMessage = useContext(MessageContext);
	const { rightPanel, setRightPanel, wide } = useContext(LayoutContext);
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
	const [fullscreen, setFullscreen] = useState(() => !!document.fullscreenElement);

	useEffect(() => {
		const resized = () => setFullscreen(!!document.fullscreenElement);
		document.addEventListener("fullscreenchange", resized);
		return () => document.removeEventListener("fullscreenchange", resized);
	}, []);

	const [playInfo, setPlayInfo] = useState<PlayInfo>({
		album: { uri: "", images: [] },
		artists: [],
		name: "",
		id: "",
		uri: "",
	});
	const [contextUri, setContextUri] = useState<string | null>(null);
	const [deviceId, setDeviceId] = useState<string | null>(null);
	const [activeDevice, setActiveDevice] = useState<NowPlayingState["device"]>(null);

	// One object per track, not per playInfo (polling hands over an equal copy every few seconds), so effects keyed on
	// the track don't run again on play, pause or a device change.
	const track = useMemo<PlayingTrack | null>(() => {
		const { id, uri, name, album, artists = [] } = playInfo;
		return name === "" ? null : {
			id,
			uri,
			name,
			artists: artists.map((artist) => ({ id: idOf(artist.uri, "artist"), name: artist.name })),
			album: { id: idOf(album?.uri, "album"), name: album?.name ?? "", images: album?.images ?? [] },
			duration_ms: playbackState.total_time,
		};
		// eslint-disable-next-line
	}, [playInfo.uri, playbackState.total_time]);

	useEffect(() => {
		onNowPlaying({ trackUri: playInfo.uri || null, contextUri, playing: playbackState.play, deviceId, device: activeDevice, track });
	}, [playInfo.uri, contextUri, playbackState.play, deviceId, activeDevice, track, onNowPlaying]);

	// Pages that follow playback get the clock when it changes and count on from it themselves, so the app isn't
	// re-rendered on every tick.
	useEffect(() => {
		const { play, progress, at, total_time } = playbackState;
		setPlaybackClock({ uri: playInfo.uri || null, play, progress, at, total_time });
		// eslint-disable-next-line
	}, [playInfo.uri, playbackState.play, playbackState.progress, playbackState.at, playbackState.total_time]);

	// Like Spotify's tab title: what's playing, while it plays.
	useEffect(() => {
		const artists = (playInfo.artists ?? []).map((artist) => artist.name).join(", ");
		document.title = playbackState.play && playInfo.name ? `${playInfo.name}${artists ? ` • ${artists}` : ""}` : "Shoutify";
	}, [playInfo, playbackState.play]);

	const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const player = useRef<Spotify.Player | null>(null);
	// The volume to go back to when unmuting.
	const unmuted = useRef(0.5);
	// Answers to reads sent before the latest bump are dropped, as they can describe playback from before a command or
	// handoff. refreshSoon bumps it (polls too: the newer read wins), and so do volume changes and the SDK's null state.
	const reads = useRef(0);

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
	// A poll goes through refreshSoon, so one that lands just after a command can't cancel its re-read and read the old state.
	useEffect(() => {
		if (deviceId !== null && activeDevice?.id === deviceId) return;
		const poll = () => document.visibilityState === "visible" && refreshSoon();
		const timer = setInterval(poll, 5000);
		document.addEventListener("visibilitychange", poll);
		return () => {
			clearInterval(timer);
			document.removeEventListener("visibilitychange", poll);
		};
		// eslint-disable-next-line
	}, [activeDevice?.id, deviceId]);

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

		// Playback status updates; the state is null once playback moves to another device, which polling then follows.
		sdkPlayer.addListener("player_state_changed", (state: Spotify.PlaybackState | null) => {
			if (!state) {
				reads.current++;
				return setActiveDevice(null);
			}
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

	// Play buttons elsewhere in the app call updateState after a command; the comment page seeks.
	useImperativeHandle(ref, () => ({ updateState: () => refreshSoon(), seek }));

	// Asks the Web API rather than the SDK, which only reports playback on this browser's own device.
	const apiUpdate = () => {
		clearTimeout(timerRef.current);
		const read = reads.current;

		// Unless asked for episodes, Spotify sends a podcast episode as `item: null`, and the last song would seem to play on.
		spotify<PlaybackResponse | undefined>("/me/player?additional_types=episode")
			.then((state) => {
				if (read !== reads.current) return;
				// 204: no device is active (the in-browser player takes over once it's ready), so nothing is playing.
				if (!state) {
					setActiveDevice(null);
					setPlaybackState((state) => ({ ...state, play: false }));
					return;
				}
				const { repeat_state, shuffle_state, is_playing, progress_ms, item, device, context } = state;
				// Keep the object while it's the same device, so NowPlaying.device only changes when the device does.
				setActiveDevice((active) => (active?.id === device.id && active.name === device.name ? active : { id: device.id, name: device.name }));
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
		reads.current++;
		clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => apiUpdate(), 500);
	};

	// Player commands fail with Spotify's reason, e.g. no active device or no Premium. `show` sets the state the command
	// asked for (never a toggle of whatever is there now, so quick double clicks can't invert it); the re-read confirms it.
	const command = (path: string, method: "PUT" | "POST", show: (state: PlaybackState) => PlaybackState = (state) => state) => {
		return playerCommand(path, deviceId, { method })
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

	const seek = (time: number) => command(`/me/player/seek?position_ms=${time}`, "PUT", (state) => ({ ...state, progress: time, at: Date.now() }));

	const seekPlayback = (ratio: number) => {
		setScrubPb(null);
		return seek(Math.round(ratio * playbackState.total_time));
	};

	const position = positionAt(playbackState, now);

	const scrubPlayback = (ratio: number | null) => setScrubPb(ratio === null ? null : ratio * playbackState.total_time);

	const seekVolume = (ratio: number) => {
		return playerCommand(`/me/player/volume?volume_percent=${Math.round(ratio * 100)}`, deviceId, { method: "PUT" })
			.then(() => {
				reads.current++;
				setVolume(ratio);
			})
			.catch((error) => setMessage(`ERROR: ${error.message}`));
	};

	// The volume icon mutes and unmutes, as on Spotify.
	const toggleMute = () => {
		if (volume > 0) unmuted.current = volume;
		seekVolume(volume > 0 ? 0 : unmuted.current);
	};

	const writeComment = useWriteComment();
	const loaded = playInfo.name !== "";
	// The comment page looks the song up as a Spotify track, which episodes and local files aren't.
	const isTrack = playInfo.uri.startsWith("spotify:track:");
	// Another device is playing (a device without an id is never this browser's player): the green bar says which.
	const elsewhere = activeDevice && (activeDevice.id === null || activeDevice.id !== deviceId) ? activeDevice : null;
	const togglePanel = (panel: "now-playing" | "queue") => setRightPanel(rightPanel === panel ? null : panel);
	const toggleFullscreen = () =>
		(document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch((error) =>
			setMessage(`Couldn't switch full screen: ${error.message}`),
		);

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
							steps={playbackState.total_time / 1000}
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

				{/* The right panel's toggles go with the panel below 1100px; Full screen only where the browser allows it. */}
				<div className="player-right">
					{wide && (
						<ControlButton
							title="Now playing view"
							icon="NowPlayingView"
							active={loaded && rightPanel === "now-playing"}
							disabled={!loaded}
							onClick={() => togglePanel("now-playing")}
						/>
					)}
					<ControlButton
						title={isTrack ? "Comment" : loaded ? "Podcasts and local files can't be commented on" : "Play a song to comment on it"}
						icon="Comment"
						size="x-larger"
						disabled={!isTrack}
						onClick={() => playInfo.id && writeComment(playInfo.id)}
					/>
					{wide && <ControlButton title="Queue" icon="Queue" active={rightPanel === "queue"} onClick={() => togglePanel("queue")} />}

					<span className="connect-devices-wrapper">
						{connectTip && (
							<ConnectDevices
								closeTip={() => setConnectTip(false)}
								onSwitch={refreshSoon}
							/>
						)}
						<ControlButton
							title="Devices"
							icon="Speaker"
							size="x-larger"
							onClick={() => setConnectTip(!connectTip)}
							active={elsewhere !== null}
							expanded={connectTip}
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
						<ProgressBar
							label="Volume"
							extraClass="volume"
							steps={100}
							value={volume}
							setValue={seekVolume}
							valueText={(ratio) => `${Math.round(ratio * 100)}%`}
						/>
					</div>
					{document.fullscreenEnabled && (
						<ControlButton title={fullscreen ? "Exit full screen" : "Full screen"} icon="Fullscreen" extraClass="fullscreen" onClick={toggleFullscreen} />
					)}
				</div>
			</div>

			{/* Like Spotify's green bar under the player; it opens the device picker too. */}
			{elsewhere && (
				<button className="playing-on no-outline" aria-expanded={connectTip} onClick={() => setConnectTip(!connectTip)}>
					<Icon name="VolumePlaying" width="16" height="16" />
					Playing on {elsewhere.name}
				</button>
			)}
		</>
	);
};

export default Player;
