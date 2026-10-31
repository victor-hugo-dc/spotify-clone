import React, { useEffect, useRef, useState } from 'react'

type Details = {name: string, description: string}

// The playlist "Edit details" dialog. A native <dialog> traps focus and closes on Escape.
// It stays open, with what was typed, until onSave resolves to true (saved).
export default function EditDetails({details, onSave, onClose}: {details: Details, onSave: (details: Details) => Promise<boolean>, onClose: () => void}) {
    const ref = useRef<HTMLDialogElement>(null)
    const [draft, setDraft] = useState(details)
    const [saving, setSaving] = useState(false)

    useEffect(() => ref.current?.showModal(), [])

    return (
        <dialog ref={ref} className='editDetails' aria-labelledby='edit-details-title' onClose={onClose}>
            <form onSubmit={(e) => {
                e.preventDefault()
                setSaving(true)
                onSave({name: draft.name.trim(), description: draft.description.trim()}).then((saved) => saved ? ref.current?.close() : setSaving(false))
            }}>
                <h1 id='edit-details-title'>Edit details</h1>
                <label>
                    <span>Name</span>
                    {/* A name of only spaces passes `required` but would be saved as no name. */}
                    <input value={draft.name} required pattern='.*\S.*' maxLength={100} onChange={(e) => setDraft({...draft, name: e.target.value})}/>
                </label>
                <label>
                    <span>Description</span>
                    <textarea value={draft.description} maxLength={300} placeholder='Add an optional description' onChange={(e) => setDraft({...draft, description: e.target.value})}/>
                </label>
                <div className='editDetailsActions'>
                    <button type='button' className='PromptButton' style={{backgroundColor: 'transparent', color: '#fff'}} onClick={() => ref.current?.close()}>Cancel</button>
                    <button type='submit' className='PromptButton' style={{backgroundColor: '#fff', color: '#000'}} disabled={saving}>Save</button>
                </div>
            </form>
        </dialog>
    )
}
