import React, {useState, useEffect, useRef} from 'react';

type Props = {
    extraClass: string,
    value: number,
    engageClass: string,
    setValue: (ratio: number) => void,
    scrubFunction?: (ratio: number) => void,
}

const ProgressBar = ({extraClass, value, engageClass, setValue, scrubFunction}: Props) => {
    const [engage, setEngage] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [scrub, setScrub] = useState<number | null>(null)

    const wrapperRef = useRef<HTMLDivElement>(null)


    useEffect(() => {
        window.addEventListener('mousemove', handleMove)
        window.addEventListener('mouseup', handleMouseUp)
        
        return () => {
            window.removeEventListener('mousemove', handleMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    })

    const handleMouseUp = (e: MouseEvent) => {
        setIsDragging(false)
        if (engage && scrub !== null){
            setValue(scrub)
        }
        setScrub(null)
        const classes = (e.target as Element).classList
        if (!classes.contains('progress-wrapper') &&
            !classes.contains('progress-bar') &&
            !classes.contains('progress') &&
            !classes.contains('progress-slider') ){
            setEngage(false)
        }
    }

    const handleMove = (e: MouseEvent) => {
        if (engage && isDragging && wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect()
            let offsetRatio = (e.pageX - rect.x)/rect.width

            if (offsetRatio < 0){
                offsetRatio = 0.001 
            }else if (offsetRatio > 1){
                offsetRatio = 1
            }
            
            if(scrubFunction){
                scrubFunction(offsetRatio)
            }
            setScrub(offsetRatio)
        }
    }

    const handleEnter = () => {
        setEngage(true)
    }

    const handleLeave = () => {
        if (!isDragging){
            setEngage(false)
        }
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true)
        if (!wrapperRef.current) return
        const rect = wrapperRef.current.getBoundingClientRect()
        const offsetRatio = (e.pageX - rect.x)/rect.width
        setScrub(offsetRatio)
    }

    const position = scrub ?? value

    return (
        <div ref={wrapperRef} className="progress-wrapper" onMouseEnter={handleEnter} onMouseLeave={handleLeave} onMouseDown={handleMouseDown}>
            <div className={`progress-bar`} >
                <div className={`progress ${extraClass} ${engage? engageClass:''}`} style={{transform: `translate(-${((1-position)*100).toFixed(2)}%)`}} ></div>
            </div>
            <button className={`progress-slider ${extraClass} no-outline ${engage? engageClass:''}`} style={{left: `${(position*100).toFixed(2)}%`}} ></button>
        </div>
    );
}

export default ProgressBar;
