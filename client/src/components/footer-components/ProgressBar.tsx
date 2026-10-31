import React, {useRef, useState, type CSSProperties} from 'react';

type Props = {
    label: string,
    extraClass: string,
    // How many steps the bar has. An arrow key moves one, so make one a change you notice (1%, a second).
    steps: number,
    value: number,
    // Sends the value; the bar shows it until this settles, then `value` again.
    setValue: (ratio: number) => Promise<unknown>,
    // Called while dragging, and with null once the drag is committed.
    scrubFunction?: (ratio: number | null) => void,
    valueText?: (ratio: number) => string,
}

// A native range input, so the keyboard, screen readers and touch all work; CSS draws it like Spotify's bars, with
// --progress as the filled part. The value is sent (setValue) when the drag or key press ends, so a held key sends it
// once. A screen reader sets it with no key or pointer down, so that is sent at once. Until Spotify has answered, the
// bar shows the value sent, so quick presses add up and a screen reader reads back its own change.
const ProgressBar = ({label, extraClass, steps, value, setValue, scrubFunction, valueText}: Props) => {
    const [scrub, setScrub] = useState<number | null>(null)
    const [sent, setSent] = useState<number | null>(null)
    const sends = useRef(0)
    const pressed = useRef(false)
    const position = Math.min(1, Math.max(0, scrub ?? sent ?? (Number.isFinite(value) ? value : 0)))

    const send = (ratio: number) => {
        const n = ++sends.current
        setSent(ratio)
        setValue(ratio).finally(() => n === sends.current && setSent(null))
    }

    const commit = () => {
        pressed.current = false
        if (scrub === null) return
        send(scrub)
        setScrub(null)
        scrubFunction?.(null)
    }

    return (
        <input
            type='range'
            className={`progress-range ${extraClass}`}
            aria-label={label}
            aria-valuetext={valueText?.(position)}
            min={0}
            max={steps}
            value={Math.round(position * steps)}
            style={{'--progress': `${position * 100}%`} as CSSProperties}
            onChange={(e) => {
                const ratio = Number(e.target.value) / steps
                if (!pressed.current) return send(ratio)
                setScrub(ratio)
                scrubFunction?.(ratio)
            }}
            onKeyDown={() => (pressed.current = true)}
            onPointerDown={() => (pressed.current = true)}
            onPointerUp={commit}
            onKeyUp={commit}
            onBlur={commit}
        />
    );
}

export default ProgressBar;
