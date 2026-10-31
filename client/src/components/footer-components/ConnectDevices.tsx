import React, { useState, useEffect, type MouseEvent } from "react";

import ConnectDevicesItem from "./ConnectDevicesItem";

import { spotify } from "../../utilities/spotify";

type Device = { id: string | null; name: string; is_active: boolean };

const ConnectDevices = ({ closeTip, onSwitch }: { closeTip: () => void; onSwitch: () => void }) => {
	const [devices, setDevices] = useState<Device[] | null>(null);
	const [error, setError] = useState("");

	useEffect(() => {
		const controller = new AbortController();
		// pointerdown, not click: React 19 runs this effect during the click that opened the popup, which would close it
		// again. Presses on the Devices button and the "Playing on" bar are left to their own toggles.
		const outside = (e: PointerEvent) => {
			if (!(e.target as Element).closest(".connect-devices-wrapper, .playing-on")) closeTip();
		};
		const escape = (e: KeyboardEvent) => e.key === "Escape" && closeTip();

		document.addEventListener("pointerdown", outside);
		document.addEventListener("keydown", escape);
		spotify<{ devices: Device[] }>("/me/player/devices", { signal: controller.signal })
			.then((response) => setDevices(response.devices))
			.catch((error) => setError(`Couldn't load your devices: ${error.message}`));

		return () => {
			document.removeEventListener("pointerdown", outside);
			document.removeEventListener("keydown", escape);
			controller.abort();
		};
		// eslint-disable-next-line
	}, []);

	const switchDevice = (e: MouseEvent<HTMLButtonElement>) => {
		const id = e.currentTarget.dataset.id;
		spotify("/me/player", { method: "PUT", body: { device_ids: [id] } })
			.then(() => {
				onSwitch();
				closeTip();
			})
			.catch((error) => setError(`Couldn't switch device: ${error.message}`));
	};

	return (
		<div className="connect-devices" data-source="inside">
			<div className="connect-devices-content" data-source="inside">
				<div className="connect-devices-title" data-source="inside">
					<h1 data-source="inside">Connect to a device</h1>
					<p data-source="inside">
						Below are the connected devices that you have on your network, use
						Spotify Clone Player to listen here (try closing and opening this
						popup if you don't see it)
					</p>
					<br data-source="inside"></br>
					<p data-source="inside">
						This app also works as a remote controller - log in to an official
						Spotify app on the same network to checkout this feature
					</p>
				</div>

				{error && <p className="connect-devices-error" role="alert">{error}</p>}
				{devices === null ? (
					!error && <ConnectDevicesItem name="Looking for devices…" disable />
				) : devices.length === 0 ? (
					<ConnectDevicesItem name="No devices available" disable />
				) : (
					devices.map((device, index) => {
						return (
							<ConnectDevicesItem
								name={device.name}
								key={index}
								active={device.is_active}
								id={device.id}
								onClick={switchDevice}
							/>
						);
					})
				)}
			</div>
		</div>
	);
};

export default ConnectDevices;
