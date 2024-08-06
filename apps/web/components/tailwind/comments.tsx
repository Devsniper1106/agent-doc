import { formatDate } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export type Comment = {
  id: string;
  content: string;
  createdAt: string;
};

interface CommentDisplayProps {
  id: string;
  comment: Comment;
  onChange: (content: string) => void;
}

const CommentDisplay = ({ id, comment, onChange }: CommentDisplayProps) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState(comment.content);

  useEffect(() => {
    onChange(inputValue);
  }, [inputValue]);

  return (
    <div className="p-2 h-auto relative border-muted bg-background sm:rounded-lg sm:border sm:shadow-sm">
      <p className="px-2 text-sm text-neutral-500">{formatDate(comment.createdAt)}</p>
      <textarea
        className="w-full py-1 px-2 resize-none bg-transparent break-words overflow-hidden"
        id={id}
        ref={ref}
        rows={1}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
    </div>
  );
};

type CommentsOptions = {
  comments: Comment[];
  activeCommentId: string | null;
  updateComments: (id: string, content: string) => void;
};

const Comments = ({ comments, activeCommentId, updateComments }: CommentsOptions) => {
  const ref = useRef<HTMLUListElement>(null);

  const focusOnComment = (commentId: string) => {
    if (commentId) {
      const commentInput = ref.current?.querySelector<HTMLInputElement>(`textarea#${commentId}`);
      if (commentInput) {
        commentInput.scrollIntoView({ behavior: "smooth", block: "center" });
        commentInput.focus();
      }
    }
  };

  useEffect(() => {
    if (activeCommentId) {
      focusOnComment(activeCommentId);
    }
  }, [activeCommentId]);

  return (
    <ul className="space-y-4 sticky top-0" ref={ref}>
      {comments.map((comment) => (
        <li key={comment.id}>
          <CommentDisplay
            id={comment.id}
            onChange={(content) => updateComments(comment.id, content)}
            comment={comment}
          />
        </li>
      ))}
    </ul>
  );
};

export default Comments;
