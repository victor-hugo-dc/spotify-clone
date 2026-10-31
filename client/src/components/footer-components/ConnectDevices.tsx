import React, { useState, useEffect, type MouseEvent } from "react";

import ConnectDevicesItem from "./ConnectDevicesItem";

import { spotify } from "../../utilities/spotify";

type Device = { id: string | null; name: string; is_active: boolean };

const ConnectDevices = ({ closeTip }: { closeTip: () => void }) => {
	const [devices, setDevices] = useState<Device[]>([]);

	useEffect(() => {
		const controller = new AbortController();
		const clickExit = (e: globalThis.MouseEvent) => {
			if ((e.target as HTMLElement).dataset.source !== "inside") {
				closeTip();
			}
		};

		window.addEventListener("click", clickExit);
		spotify<{ devices: Device[] }>("/me/player/devices", { signal: controller.signal })
			.then((response) => setDevices(response.devices))
			.catch((error) => console.log(error));

		return () => {
			window.removeEventListener("click", clickExit);
			controller.abort();
		};
		// eslint-disable-next-line
	}, []);

	const switchDevice = (e: MouseEvent<HTMLButtonElement>) => {
		const id = e.currentTarget.dataset.id;
		spotify("/me/player", { method: "PUT", body: { device_ids: [id] } })
			.then(() => closeTip())
			.catch((error) => console.log(error));
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

				{devices.length === 0 ? (
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
