import React, {useState, type CSSProperties} from 'react';

type Props = {
    label: string,
    extraClass: string,
    value: number,
    setValue: (ratio: number) => void,
    // Called while dragging, and with null once the drag is committed.
    scrubFunction?: (ratio: number | null) => void,
    valueText?: (ratio: number) => string,
}

// A native range input, so the keyboard, screen readers and touch all work; CSS draws it like Spotify's bars, with
// --progress as the filled part. The value is only sent (setValue) when the drag or key press ends.
const ProgressBar = ({label, extraClass, value, setValue, scrubFunction, valueText}: Props) => {
    const [scrub, setScrub] = useState<number | null>(null)
    const position = Math.min(1, Math.max(0, scrub ?? (Number.isFinite(value) ? value : 0)))

    const commit = () => {
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
            max={1000}
            value={Math.round(position * 1000)}
            style={{'--progress': `${position * 100}%`} as CSSProperties}
            onChange={(e) => {
                const ratio = Number(e.target.value) / 1000
                setScrub(ratio)
                scrubFunction?.(ratio)
            }}
            onPointerUp={commit}
            onKeyUp={commit}
            onBlur={commit}
        />
    );
}

export default ProgressBar;
