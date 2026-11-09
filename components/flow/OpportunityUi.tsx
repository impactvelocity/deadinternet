import { Icon } from './icons';
import { compact } from './parts';

/** A legible engagement row shared by the campaign and its continuing feed. */
export function OpportunityReactions({ likes = 0, comments = 0, shares = 0, liked = false }: {
  likes?: number;
  comments?: number;
  shares?: number;
  liked?: boolean;
}) {
  return (
    <div className="fl-opportunity-reactions">
      <span className="fl-opportunity-reaction-count">
        {likes > 0 ? (
          <span className="fl-opportunity-reaction-icons" aria-hidden>
            <span><Icon name="like" size={12} filled /></span>
            {likes > 1 && <span><Icon name="heart" size={12} filled /></span>}
          </span>
        ) : <span className="fl-opportunity-no-reactions" aria-hidden><Icon name="like" size={15} /></span>}
        <span>{likes ? (liked ? (likes === 1 ? 'You' : `You and ${compact(likes - 1)} others`) : compact(likes)) : 'No reactions yet'}</span>
      </span>
      <span className="fl-opportunity-reaction-details">
        <span>{compact(comments)} {comments === 1 ? 'comment' : 'comments'}</span>
        {shares > 0 && <span>{compact(shares)} {shares === 1 ? 'share' : 'shares'}</span>}
      </span>
    </div>
  );
}
