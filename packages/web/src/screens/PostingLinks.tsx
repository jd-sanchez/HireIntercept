import { Fragment } from 'react'
import { useLeads } from './LeadProvider'
import './PostingLinks.css'

export function PostingLinks({ postingIds }: { postingIds: string[] }) {
  const { canOpenPosting, openPosting } = useLeads()
  return (
    <>
      {postingIds.map((postingId, position) => (
        <Fragment key={postingId}>
          {position > 0 && ', '}
          {canOpenPosting(postingId) ? (
            <button type="button" className="posting-link" onClick={() => openPosting(postingId)}>{postingId}</button>
          ) : postingId}
        </Fragment>
      ))}
    </>
  )
}
