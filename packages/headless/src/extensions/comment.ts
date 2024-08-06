import { type Editor, Mark, mergeAttributes } from "@tiptap/core";
import { v4 as uuidv4 } from "uuid";

export interface CommentOptions {
  HTMLAttributes: Record<string, string>;
  onCommentActivated: (commentId: string) => void;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    Comment: {
      /**
       * Set a comment (add)
       */
      setComment: (attributes?: { commentId: string }) => ReturnType;
      /**
       * Toggle a comment
       */
      toggleComment: (attributes?: { commentId: string }) => ReturnType;
      /**
       * Unset a comment (remove)
       */
      unsetComment: () => ReturnType;
    };
  }
}

export const Comment = Mark.create<CommentOptions>({
  name: "comment",

  addOptions() {
    return {
      HTMLAttributes: {},
      onCommentActivated: () => {},
    };
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addStorage() {
    return {
      activeCommentId: null,
    };
  },

  onSelectionUpdate() {
    const { $from } = this.editor.view.state.selection;
    const commentMark = $from.marks().find((mark) => mark.type === this.type);
    if (!commentMark) return;
    this.options.onCommentActivated(commentMark.attrs.commentId);
  },

  addCommands() {
    return {
      setComment:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      toggleComment:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes);
        },
      unsetComment:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});

export const removeComment = (editor: Editor) => {
  const commentId = editor.getAttributes(Comment.name).commentId;
  if (!commentId) return;
  editor.chain().focus().unsetComment().run();
  return commentId;
};

export const addComment = (editor: Editor) => {
  const commentId = `c-${uuidv4()}`;
  editor.chain().focus().setComment({ commentId }).run();
  return commentId;
};
