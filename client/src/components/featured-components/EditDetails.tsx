import React, { useEffect, useRef, useState } from 'react'

type Details = {name: string, description: string}

// The playlist "Edit details" dialog. A native <dialog> traps focus and closes on Escape.
export default function EditDetails({details, onSave, onClose}: {details: Details, onSave: (details: Details) => void, onClose: () => void}) {
    const ref = useRef<HTMLDialogElement>(null)
    const [draft, setDraft] = useState(details)

    useEffect(() => ref.current?.showModal(), [])

    return (
        <dialog ref={ref} className='editDetails' aria-labelledby='edit-details-title' onClose={onClose}>
            <form onSubmit={(e) => { e.preventDefault(); onSave({name: draft.name.trim(), description: draft.description.trim()}) }}>
                <h1 id='edit-details-title'>Edit details</h1>
                <label>
                    <span>Name</span>
                    <input value={draft.name} required maxLength={100} onChange={(e) => setDraft({...draft, name: e.target.value})}/>
                </label>
                <label>
                    <span>Description</span>
                    <textarea value={draft.description} maxLength={300} placeholder='Add an optional description' onChange={(e) => setDraft({...draft, description: e.target.value})}/>
                </label>
                <div className='editDetailsActions'>
                    <button type='button' className='PromptButton' style={{backgroundColor: 'transparent', color: '#fff'}} onClick={() => ref.current?.close()}>Cancel</button>
                    <button type='submit' className='PromptButton' style={{backgroundColor: '#fff', color: '#000'}}>Save</button>
                </div>
            </form>
        </dialog>
    )
}
