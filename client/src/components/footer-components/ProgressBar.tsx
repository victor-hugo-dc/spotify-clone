import React, {useRef, useState, type CSSProperties} from 'react';

type Props = {
    label: string,
    extraClass: string,
    // How many steps the bar has. An arrow key moves one, so make one a change you notice (1%, a second).
    steps: number,
    value: number,
    setValue: (ratio: number) => void,
    // Called while dragging, and with null once the drag is committed.
    scrubFunction?: (ratio: number | null) => void,
    valueText?: (ratio: number) => string,
}

// A native range input, so the keyboard, screen readers and touch all work; CSS draws it like Spotify's bars, with
// --progress as the filled part. The value is sent (setValue) when the drag or key press ends, so a held key sends it
// once. A screen reader sets it with no key or pointer down, so that is sent at once.
const ProgressBar = ({label, extraClass, steps, value, setValue, scrubFunction, valueText}: Props) => {
    const [scrub, setScrub] = useState<number | null>(null)
    const pressed = useRef(false)
    const position = Math.min(1, Math.max(0, scrub ?? (Number.isFinite(value) ? value : 0)))

    const commit = () => {
        pressed.current = false
        if (scrub === null) return
        setValue(scrub)
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
                if (!pressed.current) return setValue(ratio)
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
