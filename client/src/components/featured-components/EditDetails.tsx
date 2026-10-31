import React, { useEffect, useRef, useState } from 'react'

type Details = {name: string, description: string}

// The playlist "Edit details" dialog. A native <dialog> traps focus and closes on Escape.
// It stays open, with what was typed, until onSave resolves to no error (saved).
export default function EditDetails({details, onSave, onClose}: {details: Details, onSave: (details: Details) => Promise<Error | null>, onClose: () => void}) {
    const ref = useRef<HTMLDialogElement>(null)
    const [draft, setDraft] = useState(details)
    const [error, setError] = useState('')
    // Stops a second Save while one is on its way; disabling the focused button would drop focus to the page.
    const saving = useRef(false)

    useEffect(() => ref.current?.showModal(), [])

    return (
        <dialog ref={ref} className='editDetails' aria-labelledby='edit-details-title' onClose={onClose}>
            <form onSubmit={(e) => {
                e.preventDefault()
                if (saving.current) return
                saving.current = true
                setError('')
                onSave({name: draft.name.trim(), description: draft.description.trim()}).then((failed) => {
                    saving.current = false
                    if (failed) setError(`Couldn't save: ${failed.message}`)
                    else ref.current?.close()
                })
            }}>
                <h1 id='edit-details-title'>Edit details</h1>
                <label>
                    <span>Name</span>
                    {/* A name of only spaces passes `required` but would be saved as no name; browsers add the title to their pattern error. */}
                    <input value={draft.name} required pattern='.*\S.*' title='Enter a name' maxLength={100} onChange={(e) => setDraft({...draft, name: e.target.value})}/>
                </label>
                <label>
                    <span>Description</span>
                    <textarea value={draft.description} maxLength={300} placeholder='Add an optional description' onChange={(e) => setDraft({...draft, description: e.target.value})}/>
                </label>
                {/* Here, not only as a toast: those sit under the backdrop, out of sight and out of screen readers' reach. */}
                {error && <p role='alert' style={{color: '#f15e6c', marginBottom: '16px'}}>{error}</p>}
                <div className='editDetailsActions'>
                    <button type='button' className='PromptButton' style={{backgroundColor: 'transparent', color: '#fff'}} onClick={() => ref.current?.close()}>Cancel</button>
                    <button type='submit' className='PromptButton' style={{backgroundColor: '#fff', color: '#000'}}>Save</button>
                </div>
            </form>
        </dialog>
    )
}
