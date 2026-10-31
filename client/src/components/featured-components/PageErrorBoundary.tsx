import React, { Component, type ReactNode } from 'react'
import PageTitle from './PageTitle'

type Props = { children: ReactNode, resetKey: string }

// A crash on one page shows an error there instead of blanking the whole app; the sidebar and the player keep going.
// Going to another page (a new resetKey) tries again.
export default class PageErrorBoundary extends Component<Props, { error: Error | null }> {
    state: { error: Error | null } = { error: null }

    static getDerivedStateFromError(error: Error) {
        return { error }
    }

    componentDidUpdate(previous: Props) {
        if (previous.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
    }

    render() {
        if (!this.state.error) return this.props.children
        return (
            <div className='page-content' style={{paddingTop: '16px'}} role='alert'>
                <PageTitle name='Something went wrong on this page'/>
                <p className='empty-state'>{this.state.error.message}</p>
            </div>
        )
    }
}
