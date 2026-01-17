'use client';

import { useState } from 'react';
import { DeliveryComment } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2, LogIn, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';

interface DeliveryCommentsProps {
  comments: DeliveryComment[];
  canComment: boolean;
  token: string;
  onCommentAdded: (comment: DeliveryComment) => void;
}

export function DeliveryComments({
  comments,
  canComment,
  token,
  onCommentAdded,
}: DeliveryCommentsProps) {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      const comment = await api.delivery.addComment(token, newComment);
      onCommentAdded(comment);
      setNewComment('');
      toast.success('Comment added');
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        Comments ({comments.length})
      </h3>

      {/* Comments list */}
      {comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.user.avatarUrl ?? undefined} alt={comment.user.name} />
                <AvatarFallback className="text-xs">
                  {getInitials(comment.user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{comment.user.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
                  </span>
                </div>
                <div
                  className="text-sm text-muted-foreground mt-0.5 prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_a]:text-primary [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: comment.content }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      )}

      {/* Add comment form */}
      {user ? (
        canComment ? (
          <div className="flex gap-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none"
            />
            <Button
              onClick={handleSubmit}
              disabled={submitting || !newComment.trim()}
              size="icon"
              className="shrink-0"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Only the customer can add comments.
          </p>
        )
      ) : (
        <div className="bg-muted rounded-lg p-3">
          <p className="text-sm text-muted-foreground mb-2">
            Sign in to add comments.
          </p>
          <Link href={`/login?redirect=/delivery/${token}`}>
            <Button variant="outline" size="sm">
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
