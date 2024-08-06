import { Button } from "@/components/tailwind/ui/button";
import { cn } from "@/lib/utils";
import { MessageSquarePlus } from "lucide-react";
import { EditorBubbleItem, type EditorInstance, useEditor } from "novel";
import { addComment, removeComment } from "novel/extensions";

type CommentSelectorOptions = {
  onAddComment: (id: string) => void;
  onRemoveComment: (id: string) => void;
};

const CommentSelector = ({ onAddComment, onRemoveComment }: CommentSelectorOptions) => {
  const { editor } = useEditor();

  const toggleComment = (editor: EditorInstance) => {
    if (editor.isActive("comment")) {
      const commentId = removeComment(editor);
      onRemoveComment(commentId);
    } else {
      const commentId = addComment(editor);
      onAddComment(commentId);
    }
  };

  return (
    <EditorBubbleItem onSelect={toggleComment}>
      <Button size="sm" className="rounded-none" variant="ghost">
        <MessageSquarePlus
          className={cn("h-4 w-4", {
            "text-blue-500": editor.isActive("comment"),
          })}
        />
      </Button>
    </EditorBubbleItem>
  );
};

export default CommentSelector;
