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

import { spotify } from "../../utilities/spotify";
import formatTime from "../../utilities/time";
import { MessageContext } from "../../utilities/context";
import type { Album, Track } from "../../utilities/types";

export type PlayerHandle = { updateState: () => void };

type PlaybackResponse = {
	repeat_state: string;
	shuffle_state: boolean;
	is_playing: boolean;
	progress_ms: number | null;
	item: (Track & { album: Album }) | null;
	device: { volume_percent: number | null };
};

const Player = ({ token, ref }: { token: string | null; ref?: Ref<PlayerHandle> }) => {
	const setMessage = useContext(MessageContext);
	const [playbackState, setPlaybackState] = useState({
		play: false,
		shuffle: false,
		repeat: false,
		progress: 0,
		total_time: 0,
	});

	const [scrubPb, setScrubPb] = useState<number | null>(null);
	const [playback, setPlayback] = useState(0);
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
	});

	const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const playbackIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
	const player = useRef<Spotify.Player | null>(null);

	useEffect(() => {
		loadScript();
		apiUpdate();

		window.onSpotifyWebPlaybackSDKReady = () => playerInit();

		return () => {
			clearTimeout(timerRef.current);
			clearInterval(playbackIntervalRef.current);
			player.current?.disconnect();
		};
		// eslint-disable-next-line
	}, []);

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
				fetch("/api/token")
					.then((response) => response.json())
					.then(({ access_token }) => cb(access_token))
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

		// Playback status updates; the state is null once playback moves to another device.
		sdkPlayer.addListener("player_state_changed", (state: Spotify.PlaybackState | null) => {
			if (!state) return;
			const { duration, position, paused, shuffle, repeat_mode, track_window } = state;

			setPlayInfo(track_window.current_track);
			setPlayback(position / duration);
			setPlaybackState((state) => ({
				...state,
				play: !paused,
				shuffle: shuffle,
				repeat: repeat_mode !== 0,
				progress: position,
				total_time: duration,
			}));
		});

		// Ready
		sdkPlayer.addListener("ready", ({ device_id }) => {
			console.log("Ready with Device ID", device_id);
			const tipAccess = localStorage.getItem("tipAccess");
			if (!tipAccess) {
				localStorage.setItem("tipAccess", "true");
				setConnectTip(true);
			}
		});

		// Not Ready
		sdkPlayer.addListener("not_ready", ({ device_id }) => {
			console.log("Device ID has gone offline", device_id);
		});

		// Connect to the player!
		sdkPlayer.connect();
	};

	//Reference for parent component to use updateState
	useImperativeHandle(ref, () => ({
		updateState: () => {
			setPlaybackState((state) => ({ ...state, play: true }));
			apiUpdate();
		},
	}));

	// Asks the Web API rather than the SDK, which only reports playback on this browser's own device.
	const apiUpdate = () => {
		clearTimeout(timerRef.current);

		spotify<PlaybackResponse | undefined>("/me/player", token)
			.then((state) => {
				// 204: nothing is playing on any device.
				if (!state) {
					setMessage("Select a device to start listening");
					setConnectTip(true);
					return;
				}
				const { repeat_state, shuffle_state, is_playing, progress_ms, item, device } = state;
				if (!item) return;
				const progress = progress_ms ?? 0;
				setPlayback(progress / item.duration_ms);

				// Check again when the track ends.
				timerRef.current = setTimeout(() => apiUpdate(), item.duration_ms - progress + 10);

				setVolume((device.volume_percent ?? 100) / 100);
				setPlaybackState((state) => ({
					...state,
					play: is_playing,
					shuffle: shuffle_state,
					repeat: repeat_state !== "off",
					progress,
					total_time: item.duration_ms,
				}));
				setPlayInfo(item);
			})
			.catch((error) => console.log(error));
	};

	const updatePlayback = () => {
		const interval = 500 / playbackState.total_time;
		setPlayback((playback) => playback + interval);
		setPlaybackState((state) => ({ ...state, progress: state.progress + 500 }));
	};

	useEffect(() => {
		if (playbackState.play) {
			playbackIntervalRef.current = setInterval(updatePlayback, 500);
		} else {
			clearInterval(playbackIntervalRef.current);
		}

		return () => clearInterval(playbackIntervalRef.current);
		// eslint-disable-next-line
	  }, [playbackState.play]);

	// Player commands fail with Spotify's reason, e.g. no active device or no Premium.
	const command = (path: string, method: "PUT" | "POST", onDone: () => void) => {
		spotify(path, token, { method })
			.then(onDone)
			.catch((error) => setMessage(`ERROR: ${error.message}`));
	};

	const togglePlay = () => {
		command(`/me/player/${playbackState.play ? "pause" : "play"}`, "PUT", () => {
			setPlaybackState((state) => ({ ...state, play: !state.play }));
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
			setPlayback(ratio);
			setPlaybackState((state) => ({ ...state, progress: time }));
			apiUpdate();
		});

		setScrubPb(null);
	};

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
							{scrubPb
								? formatTime(scrubPb)
								: formatTime(playbackState.progress)}
						</div>
						<ProgressBar
							extraClass="playback"
							value={playback}
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
										token={token}
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
									token={token}
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
